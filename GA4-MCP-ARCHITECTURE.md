# Google Analytics 4 MCP Integration Architecture

## Overview

This chatbot now properly integrates with the **official [Google Analytics MCP Server](https://github.com/googleanalytics/google-analytics-mcp)** (Python-based) to dynamically retrieve and execute GA4 analytics tools.

## Key Changes

### ❌ What Was Wrong Before

The initial implementation **hardcoded** the GA4 tools in TypeScript:
- Tools were manually defined in code
- No actual connection to the official MCP server
- Would require manual updates when new tools are added
- Not following the MCP architecture properly

### ✅ What's Correct Now

The new implementation:
- **Dynamically connects** to the official Python-based Google Analytics MCP server
- **Automatically retrieves** available tools from the server
- **No hardcoding** - tools are discovered at runtime
- **Future-proof** - automatically supports new tools when the server is updated

## Architecture Flow

```
User Browser
    ↓
Next.js Chat API (/api/chat)
    ↓
MCP TypeScript Client
    ↓ (stdio transport)
Python MCP Server (analytics-mcp)
    ↓
Google Analytics APIs
```

## How It Works

### 1. Server Setup
- The official `analytics-mcp` Python package is installed via `pipx`
- When a user connects GA4, their OAuth tokens are saved

### 2. Connection Process
1. User clicks "Connect GA4" → OAuth flow
2. Backend receives OAuth tokens
3. Tokens are written to a temporary JSON file in the format Google expects
4. The TypeScript client spawns the Python MCP server via `pipx run analytics-mcp`
5. Server starts with `GOOGLE_APPLICATION_CREDENTIALS` pointing to the temp file
6. Client connects to the server via stdio transport

### 3. Tool Discovery
1. After connection, client calls `listTools()` on the MCP server
2. Server returns all available GA4 tools dynamically
3. Tools are cached and made available to the LLM

### 4. Query Execution
1. User asks analytics question
2. LLM sees available tools and decides which to use
3. LLM calls the tool with appropriate parameters
4. TypeScript client forwards the call to Python MCP server
5. Python server executes the Google Analytics API call
6. Results are returned to LLM for natural language response

## Available Tools (Dynamically Loaded)

These tools are **automatically retrieved** from the server:

| Tool Name | Description |
|-----------|-------------|
| `get_account_summaries` | List all GA4 accounts and properties |
| `get_property_details` | Get detailed information about a property |
| `list_google_ads_links` | List Google Ads accounts linked to a property |
| `run_report` | Run custom GA4 reports with dimensions and metrics |
| `get_custom_dimensions_and_metrics` | Get custom dimensions and metrics for a property |
| `run_realtime_report` | Run realtime reports |

## File Structure

```
lib/
  mcp/
    client.ts                        # MCP client manager
    registry.ts                      # Server registration
    types.ts                         # TypeScript interfaces
    servers/
      google-analytics-client.ts     # GA4 MCP client (connects to Python server)

app/api/
  chat/route.ts                      # Chat API with MCP integration
  auth/google/
    route.ts                         # OAuth initiation
    callback/route.ts                # OAuth callback handler
```

## Environment Variables Required

```env
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_PROJECT_ID=your-project-id

# OpenAI
OPENAI_API_KEY=your_openai_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Prerequisites

1. **Python 3.10+** - Required for the MCP server
2. **pipx** - Python package runner
3. **analytics-mcp** - The official Google Analytics MCP server
4. **Node.js** - For the Next.js app
5. **Google Cloud Project** with:
   - Analytics Admin API enabled
   - Analytics Data API enabled
   - OAuth 2.0 credentials configured

## Key Benefits

### 🔄 Dynamic Tool Loading
- No code changes needed when Google adds new tools
- Always up-to-date with the latest MCP server capabilities

### 🏗️ Proper MCP Architecture
- Follows the Model Context Protocol specification
- Clean separation between client and server
- Extensible for adding more MCP servers (e.g., Google Ads, Search Console)

### 🔐 Secure Credential Management
- OAuth tokens never stored in code
- Temporary credential files for the Python server
- Proper cleanup and isolation

### 🚀 Future-Proof
- When Google adds features to their MCP server, they automatically appear
- No maintenance required on our end
- Community contributions to the official server benefit everyone

## Testing

To verify the integration is working:

1. Check server connection logs:
```
Starting GA4 MCP server with credentials at: /tmp/ga4-mcp-creds-xxx.json
Successfully connected to GA4 MCP server
```

2. Check tool discovery logs:
```
Dynamically loaded GA4 tools: [array of tools]
```

3. Test with a query like:
```
"Show me all my Google Analytics accounts and properties"
```

The LLM should call `get_account_summaries` and return your actual GA4 data.

## Troubleshooting

### "pipx: command not found"
- Install pipx: `python -m pip install --user pipx`
- Add to PATH: `python -m pipx ensurepath`
- Restart terminal

### "analytics-mcp not found"
- Install: `pipx install analytics-mcp`
- Verify: `pipx run analytics-mcp --help`

### "Failed to connect to Google Analytics MCP server"
- Check Python 3.10+ is installed: `python --version`
- Verify APIs are enabled in Google Cloud Console
- Check OAuth scopes include `analytics.readonly`

### "No tools retrieved"
- Check server startup logs
- Verify credentials file was created
- Ensure GOOGLE_PROJECT_ID is set

## References

- [Google Analytics MCP Server (Official)](https://github.com/googleanalytics/google-analytics-mcp)
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google Analytics Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)

