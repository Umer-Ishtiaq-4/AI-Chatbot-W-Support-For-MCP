# Google Search Console MCP Setup Guide

## Overview

This guide walks you through setting up Google Search Console integration for the chatbot using the official `mcp-server-gsc` package.

## Prerequisites

- Node.js 18 or later
- NPX (comes with npm)
- Google Cloud Project with Search Console API enabled
- OAuth credentials (same as GA4 setup)

## Step 1: Enable Search Console API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the same one you use for GA4)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Search Console API"
5. Click on it and click **Enable**

## Step 2: Grant Search Console Access

The user must have access to at least one Search Console property:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Ensure the user has at least one verified property
3. The OAuth token will automatically include access to these properties

## Step 3: Verify OAuth Scopes

Your existing OAuth configuration should now include the Search Console scope:

```typescript
// lib/auth/google.ts
export const GSC_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
];
```

This is already included in the `ALL_GOOGLE_SCOPES` array, so no changes needed!

## Step 4: MCP Server Installation

The GSC MCP server (`mcp-server-gsc`) is automatically installed when needed via NPX:

```bash
npx -y mcp-server-gsc
```

**No manual installation required!** The first time a user connects GSC, the system will:
1. Run `npx -y mcp-server-gsc`
2. NPX will download and cache the package
3. Subsequent connections will use the cached version

## Step 5: Test the Connection

### Via the UI

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000

3. Log in to your account

4. Click the **"Connect"** button on the **Google Search Console** card

5. Authorize in the Google OAuth popup

6. You should see a success message: "✅ Successfully connected to Google Search Console!"

### Via Chat

Try asking questions like:
- "What are my top search queries?"
- "Show me search performance for the last 30 days"
- "Which pages have high impressions but low CTR?"
- "Find quick win opportunities"

## GSC MCP Server Details

### Package Information

- **Name**: `mcp-server-gsc`
- **Author**: [@ahonn](https://github.com/ahonn)
- **Repository**: https://github.com/ahonn/mcp-server-gsc
- **Command**: `npx -y mcp-server-gsc`
- **Runtime**: Node.js

### Available Tools

The GSC MCP server provides the `search_analytics` tool with powerful features:

#### Basic Parameters
- `siteUrl` (required): Site URL (e.g., `https://example.com` or `sc-domain:example.com`)
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `dimensions`: Comma-separated list (`query`, `page`, `country`, `device`, `searchAppearance`, `date`)
- `rowLimit`: Maximum rows to return (default: 1000, max: 25000)

#### Advanced Features
- **Regex Filtering**: Use `regex:` prefix for pattern matching
- **Quick Wins Detection**: Automatically identify optimization opportunities
- **Multiple Filters**: Combine filters with various operators
- **Enhanced Analytics**: Access up to 25,000 rows of data

### Example Tool Calls

**Basic Query**:
```json
{
  "siteUrl": "https://example.com",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "dimensions": "query,page",
  "rowLimit": 100
}
```

**Advanced with Regex**:
```json
{
  "siteUrl": "https://example.com",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "dimensions": "query,page",
  "queryFilter": "regex:(AI|machine learning|ML)",
  "filterOperator": "includingRegex",
  "rowLimit": 1000
}
```

**Quick Wins**:
```json
{
  "siteUrl": "https://example.com",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "dimensions": "query,page",
  "detectQuickWins": true,
  "quickWinsConfig": {
    "positionRange": [4, 15],
    "minImpressions": 500,
    "minCtr": 2
  }
}
```

## How It Works

### Connection Flow

```
User clicks "Connect GSC"
        ↓
OAuth with GSC scopes
        ↓
Credentials saved as:
  mcp-credentials/{userId}-google-search-console.json
        ↓
Database record created:
  server_name: 'google-search-console'
        ↓
First chat query
        ↓
MCP Connection Pool spawns:
  npx -y mcp-server-gsc
        ↓
Environment:
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
        ↓
GSC tools available to AI
```

### Credentials Format

The credentials file follows the OAuth2 authorized user format:

```json
{
  "type": "authorized_user",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "refresh_token": "your-refresh-token"
}
```

## Troubleshooting

### Issue: "Search Console API not enabled"

**Solution**:
1. Go to Google Cloud Console
2. Enable "Google Search Console API"
3. Wait 1-2 minutes for propagation
4. Try connecting again

### Issue: "No properties found"

**Solution**:
1. Go to [Search Console](https://search.google.com/search-console)
2. Verify at least one property
3. Ensure the OAuth user has access
4. Reconnect the service

### Issue: "Permission denied"

**Solution**:
1. Check OAuth scopes include `webmasters.readonly`
2. Revoke old tokens in Google Account settings
3. Disconnect and reconnect GSC
4. Verify user has Search Console access

### Issue: "NPX command not found"

**Solution**:
1. Ensure npm is installed: `npm --version`
2. Update npm: `npm install -g npm`
3. NPX should be available automatically

### Issue: "MCP server timeout"

**Solution**:
1. Check internet connection
2. Try manually: `npx -y mcp-server-gsc`
3. Check firewall settings
4. Review server logs for errors

## Monitoring

### Check Connection Status

```typescript
// In your code or browser console
const stats = mcpConnectionPool.getStats();
console.log(stats);
```

### Database Query

```sql
SELECT * FROM mcp_connections
WHERE server_name = 'google-search-console'
  AND is_active = true;
```

### Logs to Watch

**Successful Connection**:
```
Starting GSC MCP server with persistent credentials: /path/to/file.json
Successfully connected to GSC MCP server
Dynamically loaded GSC tools: ['search_analytics']
```

**Tool Call**:
```
Tool called: gsc_search_analytics
Arguments: { siteUrl: "https://example.com", ... }
Tool result received from google-search-console: { ... }
```

## Advanced Configuration

### Custom MCP Server Path

If you want to use a local/custom version of the GSC MCP server, update the client:

```typescript
// lib/mcp/servers/google-search-console-client.ts
this.transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/custom/mcp-server-gsc/index.js'],
  env
});
```

### Environment Variables

The GSC MCP server uses:
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to credentials file (set automatically)

No additional configuration needed!

## Performance

### Connection Pooling

Like GA4, GSC connections are pooled:
- **First query**: Spawns NPX process (~2-3 seconds)
- **Subsequent queries**: Reuses connection (~50ms)
- **Idle cleanup**: After 60 minutes of inactivity

### Resource Usage

- **Memory**: ~8-12 MB per connection (Node.js process)
- **CPU**: Minimal when idle
- **Network**: Only when making API calls

## Security

### Credential Isolation

✅ Each user has their own credentials file
✅ File permissions: `0o600` (owner read/write only)
✅ No cross-user access
✅ Separate from GA4 credentials

### OAuth Scopes

✅ Read-only access (`webmasters.readonly`)
✅ No write permissions
✅ No access to other Google services
✅ Can be revoked anytime by user

## Testing Queries

### Basic Queries

```
"What are my top search queries?"
"Show me search performance for last month"
"Which pages get the most impressions?"
"What's my average CTR?"
```

### Advanced Queries

```
"Find pages with high impressions but low CTR"
"Show me mobile vs desktop search performance"
"Which queries have position between 4 and 10?" (Quick wins)
"Compare search performance across countries"
```

### Combined with GA4

```
"Show me organic search traffic from GSC and total traffic from GA4"
"Which pages rank well in search and also convert well?"
"Compare search impressions to actual visits"
```

## Next Steps

After successful setup:

1. ✅ Test basic GSC queries
2. ✅ Test advanced features (regex, quick wins)
3. ✅ Try combined GA4 + GSC queries
4. ✅ Monitor connection pool performance
5. ✅ Review logs for any issues

## Resources

- **MCP Server**: https://github.com/ahonn/mcp-server-gsc
- **Search Console API**: https://developers.google.com/webmaster-tools
- **Multi-Service Docs**: [docs/MULTI-SERVICE-ARCHITECTURE.md](./docs/MULTI-SERVICE-ARCHITECTURE.md)

## Support

For issues specific to:
- **MCP Server**: https://github.com/ahonn/mcp-server-gsc/issues
- **Integration**: See [docs/MULTI-SERVICE-ARCHITECTURE.md](./docs/MULTI-SERVICE-ARCHITECTURE.md)
- **OAuth**: See [docs/OAUTH-FLOW.md](./docs/OAUTH-FLOW.md)

---

**You're all set!** 🎉 Users can now connect Google Search Console and start asking questions about their search performance data.

