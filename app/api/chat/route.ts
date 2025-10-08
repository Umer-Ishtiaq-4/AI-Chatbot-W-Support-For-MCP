import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { mcpClientManager } from '@/lib/mcp/client'
import { googleAnalyticsMCPClient } from '@/lib/mcp/servers/google-analytics-client'
import '@/lib/mcp/registry' // Initialize MCP servers

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('request', request.json())
    const { message, ga4Connected, ga4Tokens } = await request.json()
    console.log('ga4Connected', ga4Connected)
    console.log('ga4Tokens', ga4Tokens)
    console.log('message', message)

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Set up MCP connection if GA4 is connected
    let ga4Tools: any[] = [];
    if (ga4Connected && ga4Tokens) {
      try {
        // Connect to GA4 MCP server if not already connected
        if (!mcpClientManager.isServerConnected('google-analytics')) {
          await googleAnalyticsMCPClient.connect(ga4Tokens);
          await mcpClientManager.connectServer('google-analytics', ga4Tokens);
        }
        
        // Get available GA4 tools dynamically from the Python MCP server
        ga4Tools = await googleAnalyticsMCPClient.listTools();
        console.log('Dynamically loaded GA4 tools:', ga4Tools);
      } catch (error) {
        console.error('Error connecting to GA4 MCP:', error);
      }
    }

    console.log('ga4Tools keys:', Object.keys(ga4Tools), 'Data type:', Array.isArray(ga4Tools) ? 'Array' : typeof ga4Tools);
    
    // Create system message with GA4 context
    let systemContent = 'You are a helpful assistant.';
    if (ga4Tools.length > 0) {
      systemContent += `\n\nYou have access to Google Analytics 4 data. Available tools:\n`;
      ga4Tools.forEach(tool => {
        systemContent += `- ${tool.name}: ${tool.description}\n`;
      });
      systemContent += `\nWhen the user asks about their analytics data, use these tools to fetch real data. Always provide specific insights based on the actual data retrieved.`;
    }

    // Check if the message is asking about analytics
    const lower = message.toLowerCase();
    const isAnalyticsQuery = ga4Connected && 
      (lower.includes('analytics') || 
       lower.includes('ga4') || 
       lower.includes('traffic') || 
       lower.includes('users') || 
       lower.includes('sessions') ||
       lower.includes('pageviews') ||
       lower.includes('account') ||
       lower.includes('propert') || // catches "property" and "properties"
       lower.includes('list') ||
       lower.includes('show'));

    // If it's an analytics query and we have GA4 connected, create a function calling completion
    if (isAnalyticsQuery && ga4Tools.length > 0) {
      const functions = ga4Tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }));

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        functions,
        function_call: 'auto',
      });

      let response = completion.choices[0]?.message?.content || '';

      // Handle function calls
      if (completion.choices[0]?.message?.function_call) {
        const functionCall = completion.choices[0].message.function_call;
        const functionName = functionCall.name;
        const functionArgs = JSON.parse(functionCall.arguments || '{}');

        try {
          // Call the MCP tool on the Python server
          const toolResult = await googleAnalyticsMCPClient.callTool(functionName, functionArgs);
          console.log('MCP Tool Result:', toolResult);
          
          // Get final response with tool result
          const finalCompletion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: systemContent,
              },
              {
                role: 'user',
                content: message,
              },
              {
                role: 'assistant',
                content: null,
                function_call: functionCall,
              },
              {
                role: 'function',
                name: functionName,
                content: JSON.stringify(toolResult),
              },
            ],
          });

          response = finalCompletion.choices[0]?.message?.content || 'No response';
        } catch (error: any) {
          console.error('Error calling GA4 tool:', error);
          response = `I encountered an error accessing your Google Analytics data: ${error.message}. Please make sure you've provided the correct property ID and have the necessary permissions.`;
        }
      }

      return NextResponse.json({ response });
    }

    // Regular completion without function calling
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemContent,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const response = completion.choices[0]?.message?.content || 'No response'

    return NextResponse.json({ response })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

