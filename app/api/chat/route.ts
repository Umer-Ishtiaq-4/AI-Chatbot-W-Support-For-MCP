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
    const { message, userId, ga4Connected } = await request.json()
    console.log('Chat request - User:', userId, 'GA4 Connected:', ga4Connected)

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Load recent conversation history (last 10 messages)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Reverse to get chronological order (oldest to newest)
    const conversationHistory = (recentMessages || []).reverse();

    // Set up MCP connection if GA4 is connected
    let ga4Tools: any[] = [];
    let mcpClient = null;
    
    if (ga4Connected) {
      try {
        // Check if credentials exist for this user
        const credentials = await CredentialManager.getCredentials(userId, 'google-analytics');
        
        if (credentials) {
          // Get or create connection from the pool (reuses existing connection)
          mcpClient = await mcpConnectionPool.getConnection(userId, 'google-analytics');
          
          // Get available GA4 tools dynamically from the Python MCP server
          ga4Tools = await mcpClient.listTools();
          console.log('Dynamically loaded GA4 tools:', ga4Tools.map(t => t.name));
        } else {
          console.log('No GA4 credentials found for user:', userId);
        }
      } catch (error) {
        console.error('Error connecting to GA4 MCP:', error);
      }
    }

    // Create system message with GA4 context
    let systemContent = 'You are a helpful assistant.';
    if (ga4Tools.length > 0) {
      systemContent += `\n\nYou have access to Google Analytics 4 data through specialized tools. Use them to answer questions about analytics data with specific, accurate information.`;
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

    if (ga4Tools.length > 0) {
      // Prepare functions for OpenAI
      const functions = ga4Tools.map(tool => ({
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
          // Execute the tool via MCP
          if (!mcpClient) {
            throw new Error('MCP client not available');
          }

          const toolResult = await mcpClient.callTool(functionName, functionArgs);
          console.log(`Tool result received:`, JSON.stringify(toolResult).substring(0, 200) + '...');

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

