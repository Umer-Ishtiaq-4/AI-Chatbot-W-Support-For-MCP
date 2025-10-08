# Database Schema Documentation

## Overview

The chatbot uses Supabase (PostgreSQL) for data storage with Row Level Security (RLS) enabled for all tables to ensure users can only access their own data.

## Tables

### 1. `messages`

Stores all chat messages between users and the AI assistant.

**Schema**:
```sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
```sql
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

**Row Level Security Policies**:
```sql
-- Users can view only their own messages
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);
```

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `role` | VARCHAR(20) | Either 'user' or 'assistant' |
| `content` | TEXT | The message content |
| `created_at` | TIMESTAMP | When the message was created |

**Constraints**:
- `role` must be either 'user' or 'assistant'
- `user_id` references `auth.users(id)` with CASCADE delete
- All fields are NOT NULL

**Usage**:
```typescript
// Insert user message
await supabase
  .from('messages')
  .insert({
    user_id: userId,
    role: 'user',
    content: 'Hello, AI!'
  });

// Load user's messages
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: true });

// Delete all user's messages
await supabase
  .from('messages')
  .delete()
  .eq('user_id', userId);
```

---

### 2. `mcp_connections`

Stores MCP server connection credentials and metadata for each user.

**Schema**:
```sql
CREATE TABLE mcp_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_name VARCHAR(100) NOT NULL,
  credentials_path TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, server_name)
);
```

**Indexes**:
```sql
CREATE INDEX idx_mcp_connections_user_id ON mcp_connections(user_id);
CREATE INDEX idx_mcp_connections_active ON mcp_connections(user_id, is_active);
```

**Row Level Security Policies**:
```sql
-- Users can view only their own MCP connections
CREATE POLICY "Users can view own MCP connections" ON mcp_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own MCP connections
CREATE POLICY "Users can insert own MCP connections" ON mcp_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own MCP connections
CREATE POLICY "Users can update own MCP connections" ON mcp_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own MCP connections
CREATE POLICY "Users can delete own MCP connections" ON mcp_connections
  FOR DELETE USING (auth.uid() = user_id);
```

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `server_name` | VARCHAR(100) | MCP server identifier (e.g., 'google-analytics') |
| `credentials_path` | TEXT | Absolute path to credentials file on server |
| `access_token` | TEXT | Google OAuth access token (optional, expires in 1hr) |
| `refresh_token` | TEXT | Google OAuth refresh token (long-lived) |
| `token_expiry` | TIMESTAMP | When access_token expires |
| `is_active` | BOOLEAN | Whether credentials are active (soft delete) |
| `created_at` | TIMESTAMP | When credentials were created |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Constraints**:
- `UNIQUE(user_id, server_name)` - One connection per user per server
- `user_id` references `auth.users(id)` with CASCADE delete
- `refresh_token` is NOT NULL (required for OAuth)

**Usage**:
```typescript
// Create new connection
await supabase
  .from('mcp_connections')
  .insert({
    user_id: userId,
    server_name: 'google-analytics',
    credentials_path: '/path/to/creds.json',
    access_token: 'ya29...',
    refresh_token: '1//0g...',
    token_expiry: new Date(Date.now() + 3600000),
    is_active: true
  });

// Get active connection
const { data } = await supabase
  .from('mcp_connections')
  .select('*')
  .eq('user_id', userId)
  .eq('server_name', 'google-analytics')
  .eq('is_active', true)
  .single();

// Update tokens
await supabase
  .from('mcp_connections')
  .update({
    access_token: newToken,
    token_expiry: newExpiry,
    updated_at: new Date()
  })
  .eq('user_id', userId)
  .eq('server_name', 'google-analytics');

// Soft delete (deactivate)
await supabase
  .from('mcp_connections')
  .update({ is_active: false, updated_at: new Date() })
  .eq('user_id', userId)
  .eq('server_name', 'google-analytics');

// Hard delete
await supabase
  .from('mcp_connections')
  .delete()
  .eq('user_id', userId)
  .eq('server_name', 'google-analytics');
```

---

## Supabase Auth Tables

### `auth.users`

Managed by Supabase Auth. Contains user authentication data.

**Key Fields**:
- `id` (UUID) - User's unique identifier
- `email` (TEXT) - User's email address
- `encrypted_password` (TEXT) - Hashed password
- `email_confirmed_at` (TIMESTAMP) - Email verification timestamp
- `created_at` (TIMESTAMP) - Account creation date

**Usage**:
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();
```

---

## Database Migrations

### Initial Setup

Run the SQL from `database/schema.sql` in Supabase SQL Editor:

```sql
-- Creates:
-- 1. messages table with indexes and RLS
-- 2. mcp_connections table with indexes and RLS
```

### Adding New MCP Server Support

When adding a new MCP server (e.g., Google Ads):

```sql
-- No schema changes needed!
-- Just insert new connection:
INSERT INTO mcp_connections (user_id, server_name, credentials_path, ...)
VALUES ('user-id', 'google-ads', '/path/to/creds.json', ...);
```

The schema is designed to support multiple MCP servers per user.

---

## Queries and Analytics

### User Message Stats

```sql
SELECT 
  user_id,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE role = 'user') as user_messages,
  COUNT(*) FILTER (WHERE role = 'assistant') as ai_messages,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM messages
GROUP BY user_id;
```

### Active MCP Connections

```sql
SELECT 
  server_name,
  COUNT(*) as active_connections,
  COUNT(*) FILTER (WHERE token_expiry > NOW()) as valid_tokens
FROM mcp_connections
WHERE is_active = true
GROUP BY server_name;
```

### Inactive Connections for Cleanup

```sql
SELECT *
FROM mcp_connections
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '30 days';
```

### User Activity

```sql
SELECT 
  u.email,
  m.message_count,
  mc.mcp_count
FROM auth.users u
LEFT JOIN (
  SELECT user_id, COUNT(*) as message_count
  FROM messages
  GROUP BY user_id
) m ON u.id = m.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as mcp_count
  FROM mcp_connections
  WHERE is_active = true
  GROUP BY user_id
) mc ON u.id = mc.user_id
ORDER BY m.message_count DESC;
```

---

## Backup and Recovery

### Export Messages

```sql
COPY (
  SELECT * FROM messages 
  WHERE user_id = 'specific-user-id'
  ORDER BY created_at
) TO '/path/to/backup.csv' WITH CSV HEADER;
```

### Export MCP Connections (without tokens)

```sql
COPY (
  SELECT 
    id, user_id, server_name, 
    credentials_path, is_active, 
    created_at, updated_at
  FROM mcp_connections
) TO '/path/to/connections.csv' WITH CSV HEADER;
```

### Restore from Backup

```sql
-- Messages
COPY messages(id, user_id, role, content, created_at)
FROM '/path/to/backup.csv' CSV HEADER;

-- MCP Connections (regenerate tokens via OAuth)
COPY mcp_connections(id, user_id, server_name, credentials_path, is_active, created_at, updated_at)
FROM '/path/to/connections.csv' CSV HEADER;
```

---

## Security Best Practices

### Row Level Security (RLS)

✅ **All tables have RLS enabled**
- Users can only access their own data
- Policies enforce user_id matching
- No way to bypass via SQL injection

### Token Storage

✅ **Tokens stored securely**
- Encrypted at rest by Supabase
- Never sent to client-side
- Access tokens expire after 1 hour
- Refresh tokens are long-lived but protected

### Credentials Path

⚠️ **Absolute paths stored**
- Paths point to server filesystem
- Never exposed to clients
- Files have restrictive permissions (0o600)

### CASCADE Deletes

✅ **User deletion cleans up everything**
- `messages` auto-deleted when user deleted
- `mcp_connections` auto-deleted when user deleted
- Credentials files should be manually cleaned

---

## Performance Considerations

### Indexes

- `messages.user_id` - Fast message loading per user
- `messages.created_at DESC` - Efficient ordering
- `mcp_connections.user_id` - Fast credential lookup
- `mcp_connections.(user_id, is_active)` - Composite for active connections

### Partitioning (Future)

For large-scale deployments:
```sql
-- Partition messages by created_at (monthly)
CREATE TABLE messages_2024_01 PARTITION OF messages
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Archival

Move old messages to archive table:
```sql
CREATE TABLE messages_archive AS SELECT * FROM messages;

DELETE FROM messages
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Related Documentation

- [MCP Connection Management](./MCP-CONNECTION-MANAGEMENT.md)
- [OAuth Flow](./OAUTH-FLOW.md)
- [Security Best Practices](./SECURITY.md)

