# Multi-Service Architecture Documentation

## Overview

The chatbot now supports multiple Google services simultaneously:
- **Google Analytics 4 (GA4)** - Analytics and website traffic data
- **Google Search Console (GSC)** - Search performance and SEO data

Users can connect either service independently, or both services together, and seamlessly query data from both in a single conversation.

## Architecture Design

### Service Independence

Each service is architecturally independent:

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Chat UI     │  │  GA4 Card    │  │  GSC Card            │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼──────────────────┼──────────────────────┼─────────────┘
          │                  │                      │
          │                  ▼                      ▼
          │         [Connect GA4]           [Connect GSC]
          │                  │                      │
          │                  └──────────┬───────────┘
          │                             │
┌─────────▼─────────────────────────────▼─────────────────────────┐
│                    Next.js API Routes                            │
│  ┌─────────────┐  ┌────────────────────────────────────┐        │
│  │ /api/chat   │  │ /api/auth/google?service={ga4|gsc} │        │
│  └──────┬──────┘  └────────────┬───────────────────────┘        │
└─────────┼──────────────────────┼──────────────────────────────┘
          │                      │
          │                      │
┌─────────▼──────────────────────▼──────────────────────────────┐
│              MCP Connection Pool & Managers                    │
│  ┌──────────────────────────────────────────────────┐         │
│  │ Connection Pool (Shared)                         │         │
│  │  - google-analytics connections                  │         │
│  │  - google-search-console connections             │         │
│  └──────────────────────────────────────────────────┘         │
│                                                                │
│  ┌──────────────────────────────────────────────────┐         │
│  │ Credential Manager (Shared)                      │         │
│  │  - userId-google-analytics.json                  │         │
│  │  - userId-google-search-console.json             │         │
│  └──────────────────────────────────────────────────┘         │
└────────────────────────────┬┬──────────────────────────────────┘
                             ││
                             ││
                ┌────────────┘└──────────────┐
                ▼                             ▼
┌───────────────────────────┐  ┌──────────────────────────────┐
│  GA4 MCP Client (Python)  │  │  GSC MCP Client (Node.js)    │
│  - analytics-mcp          │  │  - mcp-server-gsc            │
│  - run_report             │  │  - search_analytics          │
│  - get_account_summaries  │  │  - get_sites                 │
└───────────┬───────────────┘  └────────────┬─────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐  ┌──────────────────────────────┐
│  Google Analytics API │  │  Google Search Console API   │
└───────────────────────┘  └──────────────────────────────┘
```

## Key Components

### 1. OAuth Scopes Management (`lib/auth/google.ts`)

The system now supports service-specific OAuth scopes:

```typescript
// Scopes for Google Analytics 4
export const GA4_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
];

// Scopes for Google Search Console
export const GSC_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
];

// Combined scopes (when connecting both)
export const ALL_GOOGLE_SCOPES = [...GA4_SCOPES, ...GSC_SCOPES, ...COMMON_SCOPES];
```

**Key Features**:
- Service-specific scope requests
- Backward compatibility with legacy code
- Flexible OAuth flow supporting `service` parameter

### 2. MCP Server Registry (`lib/mcp/registry.ts`)

Central registry for all MCP servers:

```typescript
// Registered Services:
- google-analytics → GoogleAnalyticsMCPClient
- google-search-console → GoogleSearchConsoleMCPClient
```

**Benefits**:
- Easy to add new services
- Centralized server configuration
- Consistent initialization

### 3. Credential Manager (`lib/mcp/credential-manager.ts`)

Manages credentials for multiple services per user:

**Storage Pattern**:
```
mcp-credentials/
  {userId}-google-analytics.json
  {userId}-google-search-console.json
```

**Database Schema** (`mcp_connections` table):
```sql
UNIQUE(user_id, server_name)  -- One connection per service per user
```

### 4. Connection Pool (`lib/mcp/connection-pool.ts`)

Maintains persistent connections for all services:

**Connection Key Pattern**: `{userId}:{serverName}`

Example keys:
- `user123:google-analytics`
- `user123:google-search-console`

**Features**:
- Independent lifecycle per service
- Shared cleanup mechanisms
- Per-service connection metrics

### 5. Chat Route (`app/api/chat/route.ts`)

Intelligent multi-service query handling:

**Flow**:
1. Check which services are connected (`ga4Connected`, `gscConnected`)
2. Load tools from each connected service
3. Prefix tool names to avoid conflicts:
   - GA4: `ga4_run_report`, `ga4_get_account_summaries`
   - GSC: `gsc_search_analytics`, `gsc_get_sites`
4. Pass all tools to OpenAI
5. Route tool calls to the appropriate MCP client

**Tool Routing**:
```typescript
const tool = allTools.find(t => t.name === functionName);
const mcpClient = mcpClients[tool._service]; // 'google-analytics' or 'google-search-console'
const result = await mcpClient.callTool(tool._originalName, functionArgs);
```

## User Workflows

### Connecting a Single Service

**GA4 Only**:
1. User clicks "Connect" on GA4 card
2. OAuth popup opens with GA4 scopes
3. User authorizes
4. Credentials saved as `userId-google-analytics.json`
5. Database record created with `server_name='google-analytics'`
6. Chat has access to GA4 tools only

**GSC Only**:
1. User clicks "Connect" on GSC card
2. OAuth popup opens with GSC scopes
3. User authorizes
4. Credentials saved as `userId-google-search-console.json`
5. Database record created with `server_name='google-search-console'`
6. Chat has access to GSC tools only

### Connecting Both Services

**Option 1: Sequential Connection**
1. Connect GA4 (as above)
2. Connect GSC (as above)
3. Result: Two separate credential files, both services available

**Option 2: Simultaneous Connection** (Future Enhancement)
1. Click "Connect Both"
2. OAuth with `service=all` (all scopes)
3. Single authorization creates credentials for both services
4. Both services immediately available

### Using Multiple Services in Chat

**Example Conversation**:

```
User: "What are my top 5 pages by traffic last month?"

AI: [Calls ga4_run_report]
    Response: "Your top 5 pages are..."

User: "Which of these rank well in search results?"

AI: [Calls gsc_search_analytics for each page]
    Response: "Here's the search performance for each page..."

User: "Compare traffic vs search impressions"

AI: [Calls both ga4_run_report AND gsc_search_analytics]
    Response: "Traffic: 10K visits, Impressions: 50K searches..."
```

## Service-Specific Configuration

### Google Analytics 4 (GA4)

**MCP Server**: Python-based `analytics-mcp`
**Command**: `pipx run analytics-mcp`
**Tools**: 
- `get_account_summaries`
- `get_property_details`
- `run_report`
- `run_realtime_report`
- `get_custom_dimensions_and_metrics`
- `list_google_ads_links`

**Environment**:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/userId-google-analytics.json
```

### Google Search Console (GSC)

**MCP Server**: Node.js-based `mcp-server-gsc`
**Command**: `npx -y mcp-server-gsc`
**Tools**:
- `search_analytics` (with quick wins detection)
- Advanced filtering (regex patterns)
- Enhanced analytics (up to 25,000 rows)

**Environment**:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/userId-google-search-console.json
```

## Database Schema Updates

No schema changes required! The existing `mcp_connections` table supports multiple services:

```sql
-- Example data for a user with both services:
INSERT INTO mcp_connections (user_id, server_name, credentials_path, ...)
VALUES 
  ('user123', 'google-analytics', '/path/to/user123-google-analytics.json', ...),
  ('user123', 'google-search-console', '/path/to/user123-google-search-console.json', ...);
```

**Query for User's Connected Services**:
```sql
SELECT server_name, is_active, created_at
FROM mcp_connections
WHERE user_id = 'user123' AND is_active = true;
```

## Performance Considerations

### Connection Pooling

Each service maintains its own connection pool entry:

**Before Multi-Service**:
- 1 user = 1 connection (GA4 only)

**After Multi-Service**:
- 1 user = up to 2 connections (GA4 + GSC)
- Connections are independent
- Cleanup applies to each service separately

### Tool Call Overhead

**Minimal Overhead**:
- Tool lookup: O(1) with Map data structure
- Service routing: Direct object property access
- No performance degradation with multiple services

### Memory Usage

**Per Service Connection**:
- GA4 MCP Client: ~5-10 MB (Python process)
- GSC MCP Client: ~8-12 MB (Node.js process)
- Total per user with both: ~15-22 MB

**Acceptable Scale**:
- 100 concurrent users with both services: ~1.5-2.2 GB
- Connection pool auto-cleanup keeps memory under control

## Security Considerations

### Credential Isolation

✅ **Each service has separate credentials file**
- No cross-service credential access
- Independent token refresh
- Isolated file permissions (0o600)

### OAuth Scope Minimization

✅ **Request only needed scopes**
- GA4 connection: Only GA4 scopes
- GSC connection: Only GSC scopes
- No unnecessary permissions

### Service-Specific RLS

✅ **Database Row Level Security**
- Users can only access their own connections
- Per-service isolation enforced at DB level
- Cannot query other users' credentials

## Monitoring & Debugging

### Connection Stats by Service

```typescript
const stats = mcpConnectionPool.getStats();
// {
//   totalConnections: 15,
//   activeConnections: 12,
//   userBreakdown: {
//     'user1': 2,  // Both GA4 and GSC
//     'user2': 1,  // Only GA4
//     'user3': 2,  // Both services
//     ...
//   }
// }
```

### Service-Specific Logs

**GA4 Connection**:
```
Starting GA4 MCP server with persistent credentials: /path/to/user123-google-analytics.json
Successfully connected to GA4 MCP server
Dynamically loaded GA4 tools: ['get_account_summaries', ...]
```

**GSC Connection**:
```
Starting GSC MCP server with persistent credentials: /path/to/user123-google-search-console.json
Successfully connected to GSC MCP server
Dynamically loaded GSC tools: ['search_analytics', ...]
```

**Multi-Service Tool Call**:
```
Chat request - User: user123 GA4 Connected: true GSC Connected: true
Tool called: ga4_run_report
Tool result received from google-analytics: {...}
Tool called: gsc_search_analytics
Tool result received from google-search-console: {...}
```

### Database Queries

**Check User's Active Services**:
```sql
SELECT server_name, created_at, updated_at
FROM mcp_connections
WHERE user_id = 'user123' AND is_active = true;
```

**Service Connection Statistics**:
```sql
SELECT 
  server_name,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE token_expiry > NOW()) as active_tokens
FROM mcp_connections
WHERE is_active = true
GROUP BY server_name;
```

## Adding New Services

### Step-by-Step Guide

**1. Create MCP Client** (`lib/mcp/servers/{service}-client.ts`):
```typescript
export class NewServiceMCPClient implements MCPServerInterface {
  // Implement connect, disconnect, listTools, callTool, etc.
}
```

**2. Update OAuth Scopes** (`lib/auth/google.ts`):
```typescript
export const NEW_SERVICE_SCOPES = [
  'https://www.googleapis.com/auth/new-service.readonly'
];
```

**3. Register in MCP Registry** (`lib/mcp/registry.ts`):
```typescript
await mcpClientManager.registerServer('new-service', {
  server: {
    name: 'New Service',
    description: 'Access to new service data',
    version: '1.0.0',
    enabled: true
  },
  isConnected: false
}, newServiceMCPClient);
```

**4. Create Connection Card** (`components/NewServiceCard.tsx`):
```typescript
export default function NewServiceCard({ onConnect, isConnected, isLoading }) {
  return (
    <ServiceConnectionCard
      serviceName="New Service"
      serviceDescription="Connect to access new service data"
      serviceIcon={<CustomIcon />}
      gradientColors="from-red-500 to-orange-600"
      {...props}
    />
  );
}
```

**5. Update Chat Page** (`app/chat/page.tsx`):
```typescript
const [newServiceConnected, setNewServiceConnected] = useState(false);
// Add connection logic and UI
```

**6. Update Chat Route** (`app/api/chat/route.ts`):
```typescript
if (newServiceConnected) {
  const client = await mcpConnectionPool.getConnection(userId, 'new-service');
  const tools = await client.listTools();
  // Add to allTools with prefix
}
```

## Troubleshooting

### Issue: Service Not Available in Chat

**Symptoms**: Connection shows as "Connected" but tools aren't available

**Diagnosis**:
1. Check localStorage: `localStorage.getItem('{service}_connected')`
2. Check database: `SELECT * FROM mcp_connections WHERE user_id='...' AND server_name='...'`
3. Check credentials file exists: `ls mcp-credentials/userId-service.json`
4. Check MCP connection pool: `mcpConnectionPool.getStats()`

**Solution**:
- Reconnect the service
- Clear localStorage and reconnect
- Check server logs for MCP connection errors

### Issue: Tool Name Conflicts

**Symptoms**: Wrong service responds to tool call

**Diagnosis**:
- Check tool prefixes in chat route logs
- Verify `_service` and `_originalName` are set correctly

**Solution**:
- Ensure each service uses unique prefixes (ga4_, gsc_, etc.)
- Update tool mapping logic if conflicts occur

### Issue: OAuth Scope Errors

**Symptoms**: "Insufficient permissions" errors when calling tools

**Diagnosis**:
1. Check OAuth scopes in auth URL
2. Verify service-specific scopes are requested
3. Check token in credentials file

**Solution**:
- Disconnect and reconnect with correct service parameter
- Ensure `service=ga4` or `service=gsc` is passed to OAuth route
- Revoke old tokens in Google Account settings and reconnect

## Future Enhancements

### Planned Features

1. **Unified Connection Button**
   - "Connect All Services" option
   - Single OAuth flow for multiple services
   - Faster onboarding

2. **Service Discovery**
   - Auto-detect which services user has access to
   - Show only relevant connection cards
   - Dynamic service enablement

3. **Cross-Service Insights**
   - Automatic correlation of GA4 and GSC data
   - Combined dashboards
   - AI-powered insights across services

4. **Service Health Monitoring**
   - Real-time connection status
   - Token expiry warnings
   - Automatic reconnection prompts

5. **Advanced Routing**
   - Smart tool selection based on query intent
   - Parallel tool execution across services
   - Result aggregation and synthesis

## Related Documentation

- [MCP Connection Management](./MCP-CONNECTION-MANAGEMENT.md)
- [OAuth Flow](./OAUTH-FLOW.md)
- [Database Schema](./DATABASE-SCHEMA.md)
- [GA4 MCP Architecture](../GA4-MCP-ARCHITECTURE.md)

## Conclusion

The multi-service architecture provides:
- ✅ **Flexibility**: Connect any combination of services
- ✅ **Scalability**: Easy to add new Google services
- ✅ **Performance**: Shared connection pooling infrastructure
- ✅ **Security**: Independent credentials and isolation
- ✅ **User Experience**: Seamless multi-service conversations

The design maintains backward compatibility while enabling powerful new capabilities for users who want comprehensive insights across multiple Google platforms.

