# MCP Connection Management

## Overview

The chatbot uses a sophisticated connection pooling system to manage persistent connections to MCP (Model Context Protocol) servers. This ensures efficient resource usage and eliminates the overhead of creating new connections for every chat message.

## Architecture Components

### 1. Credential Manager (`lib/mcp/credential-manager.ts`)

**Responsibility**: Manages persistent storage of MCP server credentials

**Key Features**:
- Creates persistent credentials files (one per user per server)
- Stores credentials metadata in Supabase database
- Handles credential updates (e.g., token refresh)
- Provides cleanup mechanisms for old/inactive credentials

**Storage Location**:
```
project-root/
  mcp-credentials/
    {userId}-{serverName}.json  # e.g., abc123-google-analytics.json
```

**Database Table**: `mcp_connections`
```sql
{
  id: UUID
  user_id: UUID (references auth.users)
  server_name: VARCHAR(100)
  credentials_path: TEXT
  access_token: TEXT
  refresh_token: TEXT
  token_expiry: TIMESTAMP
  is_active: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**API**:
```typescript
// Create new credentials
await CredentialManager.createCredentials(userId, serverName, tokens);

// Get existing credentials
const creds = await CredentialManager.getCredentials(userId, serverName);

// Update credentials (e.g., after token refresh)
await CredentialManager.updateCredentials(userId, serverName, newTokens);

// Deactivate (soft delete)
await CredentialManager.deactivateCredentials(userId, serverName);

// Permanently delete
await CredentialManager.deleteCredentials(userId, serverName);

// Cleanup old credentials (30+ days inactive)
await CredentialManager.cleanupOldCredentials(30);
```

### 2. Connection Pool (`lib/mcp/connection-pool.ts`)

**Responsibility**: Maintains persistent MCP client connections and reuses them across requests

**Key Features**:
- Singleton pattern - one pool for entire application
- Connection reuse - same connection used for multiple chat messages
- Automatic idle cleanup - closes connections unused for 60+ minutes
- Per-user connection tracking
- Graceful shutdown handling

**Connection Lifecycle**:

```
User connects GA4
    ↓
Credentials created & stored
    ↓
First chat message with GA4 query
    ↓
Pool creates new MCP connection
    ↓
Connection cached in pool
    ↓
Subsequent messages reuse same connection
    ↓
After 60 min idle → connection closed
```

**API**:
```typescript
import { mcpConnectionPool } from '@/lib/mcp/connection-pool';

// Get or create connection (automatically reuses if exists)
const client = await mcpConnectionPool.getConnection(userId, 'google-analytics');

// Use the client
const tools = await client.listTools();
const result = await client.callTool('tool_name', args);

// Close specific connection
await mcpConnectionPool.closeConnection(userId, 'google-analytics');

// Close all user connections
await mcpConnectionPool.closeUserConnections(userId);

// Get stats
const stats = mcpConnectionPool.getStats();
// Returns: { totalConnections: 5, activeConnections: 4, userBreakdown: {...} }
```

**Automatic Cleanup**:
- Runs every 30 minutes
- Closes connections idle for 60+ minutes
- Logs cleanup actions for monitoring

**Graceful Shutdown**:
- Listens for SIGTERM and SIGINT signals
- Closes all connections before process exit
- Prevents orphaned MCP server processes

### 3. MCP Client (`lib/mcp/servers/google-analytics-client.ts`)

**Responsibility**: Actual connection to the Python MCP server

**Key Features**:
- Uses stdio transport to communicate with Python server
- Dynamically retrieves tools from the server
- Caches tool list to reduce server calls
- Proper error handling and logging

**Connection Process**:
```typescript
const client = new GoogleAnalyticsMCPClient();

await client.connect({
  credentials_path: '/path/to/persistent/credentials.json',
  refresh_token: 'refresh_token',
  access_token: 'access_token'
});

// Connection spawns: pipx run analytics-mcp
// with GOOGLE_APPLICATION_CREDENTIALS env var set
```

## Flow Diagrams

### Initial Connection Flow

```
User clicks "Connect GA4"
        ↓
OAuth flow initiated
        ↓
User authorizes in Google popup
        ↓
Callback receives tokens
        ↓
CredentialManager.createCredentials()
    ├── Create credentials file: mcp-credentials/userId-google-analytics.json
    └── Insert into database: mcp_connections table
        ↓
User redirected to chat with success message
        ↓
localStorage.setItem('ga4_connected', 'true')
```

### Chat Message with GA4 Query

```
User sends message
        ↓
API receives: { message, userId, ga4Connected: true }
        ↓
CredentialManager.getCredentials(userId, 'google-analytics')
    ↓ (returns credentials with file path)
mcpConnectionPool.getConnection(userId, 'google-analytics')
    ├── Check if connection exists in pool
    ├── If yes: return existing connection (FAST!)
    └── If no: create new connection
            ↓
        new GoogleAnalyticsMCPClient()
            ↓
        client.connect(credentials)
            ↓
        Spawn Python process: pipx run analytics-mcp
            ↓
        client.listTools()  (dynamically retrieve from server)
            ↓
        Cache connection in pool
        ↓
Connection ready to use
        ↓
client.listTools() → pass to OpenAI as functions
        ↓
OpenAI decides to call a tool
        ↓
client.callTool(name, args) → Python MCP server → Google Analytics API
        ↓
Results returned to OpenAI
        ↓
Final response to user
```

### Subsequent Messages (Reuse)

```
User sends another message
        ↓
API receives: { message, userId, ga4Connected: true }
        ↓
mcpConnectionPool.getConnection(userId, 'google-analytics')
    ↓
✓ Connection exists in pool!
    ↓
Return cached connection (NO new process spawned)
    ↓
client.callTool() → immediate execution
    ↓
Fast response to user
```

## Performance Benefits

### Before (Inefficient)
- ❌ Created temp file on **every message**
- ❌ Spawned new Python process **every time**
- ❌ Tools re-fetched from server **every time**
- ❌ Overhead: ~2-3 seconds per message
- ❌ Temp files accumulated

### After (Optimized)
- ✅ Credentials file created **once** per user
- ✅ Python process spawned **once** per user
- ✅ Tools fetched **once** and cached
- ✅ Overhead: ~50ms after initial connection
- ✅ Connections reused indefinitely
- ✅ Automatic cleanup of idle connections

**Performance Improvement**: ~40-60x faster for subsequent messages!

## Security Considerations

### Credentials File Security
- Stored in `mcp-credentials/` directory (outside `public/`)
- File permissions: `0o600` (owner read/write only)
- Directory permissions: `0o700` (owner only)
- Never exposed to client-side
- Per-user isolation (separate files)

### Database Security
- Row Level Security (RLS) enabled
- Users can only access their own credentials
- Soft delete (deactivate) before hard delete
- Token expiry tracking

### Connection Security
- Connections isolated per user
- No credential sharing between users
- Proper cleanup on disconnect
- Error handling prevents credential leaks

## Monitoring & Debugging

### Logs to Watch

**Successful Connection**:
```
OAuth tokens received, creating persistent credentials...
Credentials stored successfully for user: abc123
Starting GA4 MCP server with persistent credentials: /path/to/file.json
Successfully connected to GA4 MCP server
Dynamically loaded GA4 tools: ['get_account_summaries', ...]
```

**Connection Reuse**:
```
Chat request - User: abc123 GA4 Connected: true
// No "Starting GA4 MCP server" log = reusing connection!
Dynamically loaded GA4 tools: [...]  // From cache
```

**Cleanup**:
```
Cleaned up idle connection: abc123:google-analytics
Cleaned up 3 idle MCP connections
```

### Connection Stats

Query the pool stats:
```typescript
const stats = mcpConnectionPool.getStats();
console.log(stats);
// {
//   totalConnections: 10,
//   activeConnections: 8,
//   userBreakdown: {
//     'user1': 2,
//     'user2': 1,
//     ...
//   }
// }
```

### Database Queries

Check active connections:
```sql
SELECT user_id, server_name, is_active, created_at, updated_at
FROM mcp_connections
WHERE is_active = true;
```

Find old inactive credentials:
```sql
SELECT user_id, server_name, updated_at
FROM mcp_connections
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '30 days';
```

## Maintenance Tasks

### Regular Cleanup (Automated)
The connection pool automatically:
- Cleans up idle connections every 30 minutes
- Closes connections unused for 60+ minutes

### Manual Cleanup (As Needed)

**Clean up old inactive credentials**:
```typescript
await CredentialManager.cleanupOldCredentials(30); // 30+ days old
```

**Force close all connections for maintenance**:
```typescript
await mcpConnectionPool.shutdown();
```

**Delete specific user's credentials**:
```typescript
await CredentialManager.deleteCredentials(userId, 'google-analytics');
await mcpConnectionPool.closeUserConnections(userId);
```

## Troubleshooting

### Issue: "No credentials found"
**Cause**: User hasn't connected GA4 or credentials were deleted
**Solution**: User needs to reconnect via "Connect GA4" button

### Issue: "Credentials file missing"
**Cause**: File was manually deleted or server restarted and lost temp files
**Solution**: System auto-deactivates the DB entry. User reconnects.

### Issue: Connection pool growing too large
**Cause**: Many users connecting, idle cleanup not aggressive enough
**Solution**: Adjust idle threshold in `connection-pool.ts` or increase cleanup frequency

### Issue: Python process not closing
**Cause**: Graceful shutdown not working properly
**Solution**: Check SIGTERM/SIGINT handlers are registered

## Future Enhancements

1. **Token Refresh**: Automatically refresh expired access tokens
2. **Health Checks**: Periodic connection health validation
3. **Metrics**: Track connection usage, tool call frequency
4. **Multi-Server**: Support for multiple MCP servers per user
5. **Fallback**: Retry logic for failed connections
6. **Load Balancing**: Distribute connections across multiple servers

## Related Documentation

- [OAuth Flow](./OAUTH-FLOW.md)
- [Database Schema](./DATABASE-SCHEMA.md)
- [Security Best Practices](./SECURITY.md)
- [GA4 MCP Architecture](../GA4-MCP-ARCHITECTURE.md)

