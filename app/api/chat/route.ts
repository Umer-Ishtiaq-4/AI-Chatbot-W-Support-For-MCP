import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { mcpConnectionPool } from '@/lib/mcp/connection-pool'
import { CredentialManager } from '@/lib/mcp/credential-manager'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { message, ga4Connected, gscConnected } = await request.json()

    console.log('Chat request received:', message, ga4Connected, gscConnected)

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Verify user authentication from session token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = user.id; // Get userId from authenticated session
    console.log('Chat request - User:', userId, 'GA4 Connected:', ga4Connected, 'GSC Connected:', gscConnected)

    // Load recent conversation history (last 10 messages)

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Reverse to get chronological order (oldest to newest)
    const conversationHistory = (recentMessages || []).reverse();

    // Set up MCP connections for available services
    let allTools: any[] = [];
    const mcpClients: { [key: string]: any } = {};

    // Connect to GA4 if available
    if (ga4Connected) {
      try {
        const credentials = await CredentialManager.getCredentials(userId, 'google-analytics');
        console.log('GA4 credentials: ', credentials)

        if (credentials) {
          const client = await mcpConnectionPool.getConnection(userId, 'google-analytics');
          const tools = await client.listTools();

          // Add service prefix to tool names to avoid conflicts
          const ga4Tools = tools.map((tool: any) => ({
            ...tool,
            name: `ga4_${tool.name}`,
            description: `[GA4] ${tool.description}`,
            _originalName: tool.name,
            _service: 'google-analytics'
          }));

          allTools = [...allTools, ...ga4Tools];
          mcpClients['google-analytics'] = client;
          console.log('Dynamically loaded GA4 tools:', tools.map((t: any) => t.name));
        } else {
          console.log('No GA4 credentials found for user:', userId);
        }
      } catch (error) {
        console.error('Error connecting to GA4 MCP:', error);
      }
    }

    // Connect to GSC if available
    if (gscConnected) {
      try {
        const credentials = await CredentialManager.getCredentials(userId, 'google-search-console');

        if (credentials) {
          const client = await mcpConnectionPool.getConnection(userId, 'google-search-console');
          const tools = await client.listTools();

          // Add service prefix to tool names to avoid conflicts
          const gscTools = tools.map((tool: any) => ({
            ...tool,
            name: `gsc_${tool.name}`,
            description: `[GSC] ${tool.description}`,
            _originalName: tool.name,
            _service: 'google-search-console'
          }));

          allTools = [...allTools, ...gscTools];
          mcpClients['google-search-console'] = client;
          console.log('Dynamically loaded GSC tools:', tools.map((t: any) => t.name));
        } else {
          console.log('No GSC credentials found for user:', userId);
        }
      } catch (error) {
        console.error('Error connecting to GSC MCP:', error);
      }
    }

    console.log('All tools: ', allTools.map(tool => tool.name))
    
    // Create system message with service context
    let systemContent = 'You are a helpful assistant.';
    const connectedServices: string[] = [];

    if (ga4Connected && mcpClients['google-analytics']) {
      connectedServices.push('Google Analytics 4');
    }
    if (gscConnected && mcpClients['google-search-console']) {
      connectedServices.push('Google Search Console');
    }

    if (connectedServices.length > 0) {
      systemContent += `\n\nYou have access to data from the following services: ${connectedServices.join(' and ')}. Use the available tools to answer questions with specific, accurate information from these services.`;

      if (connectedServices.length > 1) {
        systemContent += `\n\nWhen answering questions, you can combine data from multiple services to provide comprehensive insights.`;
      }
    }

    // Build messages array with conversation history
    const messages: any[] = [
      {
        role: 'system',
        content: systemContent,
      },
      // Add conversation history for context
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      // Add current user message
      {
        role: 'user',
        content: message,
      },
    ];

    // Agent loop: Keep calling tools until we have a final answer
    const MAX_ITERATIONS = 5; // Prevent infinite loops
    let iteration = 0;
    let finalResponse = '';

    if (allTools.length > 0) {
      // Prepare functions for OpenAI
      const functions = allTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }));

      while (iteration < MAX_ITERATIONS) {
        iteration++;
        console.log(`\n=== Agent Iteration ${iteration} ===`);

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages,
          functions,
          function_call: 'auto',
        });

        const choice = completion.choices[0];
        const assistantMessage = choice.message;

        // If no function call, we have the final answer
        if (!assistantMessage.function_call) {
          finalResponse = assistantMessage.content || 'No response';
          console.log('Final answer received (no more tool calls)');
          break;
        }

        // LLM wants to call a function
        const functionCall = assistantMessage.function_call;
        const functionName = functionCall.name;
        const functionArgs = JSON.parse(functionCall.arguments || '{}');

        console.log(`Tool called: ${functionName}`);
        console.log(`Arguments:`, functionArgs);

        // Add assistant's function call to messages
        messages.push({
          role: 'assistant',
          content: null,
          function_call: functionCall,
        });

        try {
          // Find the tool to determine which service to use
          const tool = allTools.find(t => t.name === functionName);
          if (!tool || !tool._service || !tool._originalName) {
            throw new Error(`Tool ${functionName} not found or invalid`);
          }

          // Get the appropriate MCP client
          const mcpClient = mcpClients[tool._service];
          if (!mcpClient) {
            throw new Error(`MCP client for ${tool._service} not available`);
          }

          // Call the tool with the original name (without prefix)
          const toolResult = await mcpClient.callTool(tool._originalName, functionArgs);
          console.log(`Tool result received from ${tool._service}:`, JSON.stringify(toolResult).substring(0, 200) + '...');

          // Add function result to messages
          messages.push({
            role: 'function',
            name: functionName,
            content: JSON.stringify(toolResult),
          });

        } catch (error: any) {
          console.error(`Error calling tool ${functionName}:`, error);

          // Add error message to conversation
          messages.push({
            role: 'function',
            name: functionName,
            content: JSON.stringify({
              error: error.message,
              message: 'Failed to execute tool. Please try a different approach.'
            }),
          });
        }

        // Continue loop - LLM will decide next action based on tool results
      }

      // If we hit max iterations without a final answer
      if (iteration >= MAX_ITERATIONS && !finalResponse) {
        console.warn('Max iterations reached, forcing final response');

        // Ask LLM to provide final answer with what it has
        messages.push({
          role: 'system',
          content: 'Please provide a final answer based on the information gathered so far.'
        });

        const finalCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages,
        });

        finalResponse = finalCompletion.choices[0]?.message?.content || 'Unable to complete the request.';
      }

      return NextResponse.json({ response: finalResponse });
    }

    // Regular completion without function calling (no GA4 tools available)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
    })

    finalResponse = completion.choices[0]?.message?.content || 'No response'

    return NextResponse.json({ response: finalResponse })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

