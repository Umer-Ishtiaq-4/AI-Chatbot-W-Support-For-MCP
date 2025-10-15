# Database Documentation

Complete reference for the database schema, queries, and management.

## Overview

The chatbot uses **Supabase (PostgreSQL)** with **Row Level Security (RLS)** enabled on all tables to ensure users can only access their own data.

## Tables

### 1. `messages` Table

Stores all chat messages between users and the AI assistant.

#### Schema
```sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
```

#### Row Level Security
```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

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

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `role` | VARCHAR(20) | Either 'user' or 'assistant' |
| `content` | TEXT | The message content |
| `created_at` | TIMESTAMP | When the message was created |

#### Usage Examples

```typescript
// Insert user message
await supabase
  .from('messages')
  .insert({
    user_id: userId,
    role: 'user',
    content: 'Hello, AI!'
  });

// Load user's conversation history
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: true });

// Get last 10 messages for context
const { data: recent } = await supabase
  .from('messages')
  .select('role, content')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);

// Clear all user's messages
await supabase
  .from('messages')
  .delete()
  .eq('user_id', userId);
```

---

### 2. `mcp_connections` Table

Stores MCP server connection credentials and metadata for each user.

#### Schema
```sql
CREATE TABLE IF NOT EXISTS mcp_connections (
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

#### Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_mcp_connections_user_id ON mcp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_active ON mcp_connections(user_id, is_active);
```

#### Row Level Security
```sql
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MCP connections" ON mcp_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own MCP connections" ON mcp_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MCP connections" ON mcp_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own MCP connections" ON mcp_connections
  FOR DELETE USING (auth.uid() = user_id);
```

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `server_name` | VARCHAR(100) | MCP server identifier (e.g., 'google-analytics', 'google-search-console') |
| `credentials_path` | TEXT | Absolute path to credentials file on server |
| `access_token` | TEXT | Google OAuth access token (expires in 1hr) |
| `refresh_token` | TEXT | Google OAuth refresh token (long-lived) |
| `token_expiry` | TIMESTAMP | When access_token expires |
| `is_active` | BOOLEAN | Whether credentials are active |
| `created_at` | TIMESTAMP | When credentials were created |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### Usage Examples

```typescript
// Get active GA4 connection for user
const { data } = await supabase
  .from('mcp_connections')
  .select('*')
  .eq('user_id', userId)
  .eq('server_name', 'google-analytics')
  .eq('is_active', true)
  .single();

// Deactivate connection (soft delete)
await supabase
  .from('mcp_connections')
  .update({ is_active: false, updated_at: new Date() })
  .eq('user_id', userId)
  .eq('server_name', 'google-analytics');

// Delete connection permanently
await supabase
  .from('mcp_connections')
  .delete()
  .eq('user_id', userId)
  .eq('server_name', 'google-analytics');
```

---

## Setup Instructions

### 1. Access Supabase Dashboard

Go to [app.supabase.com](https://app.supabase.com) and select your project.

### 2. Run Database Schema

1. Navigate to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `database/schema.sql`
4. Click **Run**

### 3. Verify Tables

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('messages', 'mcp_connections');

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## Common Queries

### User Statistics

```sql
-- Total messages per user
SELECT 
  user_id,
  COUNT(*) as message_count,
  MAX(created_at) as last_message
FROM messages
GROUP BY user_id
ORDER BY message_count DESC;

-- Active MCP connections
SELECT 
  user_id,
  server_name,
  created_at,
  updated_at
FROM mcp_connections
WHERE is_active = true;

-- Connection stats by service
SELECT 
  server_name,
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE is_active = true) as active_connections
FROM mcp_connections
GROUP BY server_name;
```

### Conversation Analysis

```sql
-- Recent conversations
SELECT 
  m.user_id,
  m.role,
  m.content,
  m.created_at
FROM messages m
WHERE m.user_id = 'specific-user-id'
ORDER BY m.created_at DESC
LIMIT 20;

-- Message distribution
SELECT 
  role,
  COUNT(*) as count,
  AVG(LENGTH(content)) as avg_length
FROM messages
GROUP BY role;

-- Daily activity
SELECT 
  DATE(created_at) as date,
  COUNT(*) as messages,
  COUNT(DISTINCT user_id) as active_users
FROM messages
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Maintenance Queries

```sql
-- Find inactive connections for cleanup
SELECT *
FROM mcp_connections
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '30 days';

-- Credential file audit
SELECT 
  user_id,
  server_name,
  credentials_path,
  is_active,
  created_at
FROM mcp_connections
ORDER BY created_at DESC;

-- User connection summary
SELECT 
  u.email,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT mc.id) as connection_count
FROM auth.users u
LEFT JOIN messages m ON u.id = m.user_id
LEFT JOIN mcp_connections mc ON u.id = mc.user_id AND mc.is_active = true
GROUP BY u.id, u.email
ORDER BY message_count DESC;
```

---

## Backup & Recovery

### Export Data

```sql
-- Export messages
COPY (
  SELECT * FROM messages 
  WHERE user_id = 'specific-user-id'
  ORDER BY created_at
) TO '/path/to/messages_backup.csv' WITH CSV HEADER;

-- Export connections (without sensitive tokens)
COPY (
  SELECT 
    id, user_id, server_name, 
    is_active, created_at, updated_at
  FROM mcp_connections
) TO '/path/to/connections_backup.csv' WITH CSV HEADER;
```

### Restore Data

```sql
-- Restore messages
COPY messages(id, user_id, role, content, created_at)
FROM '/path/to/messages_backup.csv' CSV HEADER;

-- Note: MCP connections require OAuth re-authorization
-- Cannot restore tokens directly
```

---

## Security Best Practices

### Row Level Security ✅

- **Enabled on all tables** - Users isolated by `auth.uid()`
- **SELECT policies** - Users can only view their own data
- **INSERT policies** - Users can only insert with their own user_id
- **UPDATE policies** - Users can only modify their own records
- **DELETE policies** - Users can only delete their own records

### Token Storage ✅

- **Encrypted at rest** by Supabase
- **Never sent to client** - Server-side only
- **Access tokens expire** after 1 hour
- **Refresh tokens** are long-lived but protected
- **Credential files** have mode 0o600 (owner read/write only)

### Data Protection

```sql
-- Verify RLS is enabled
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;
-- Should return no results

-- Check policy coverage
SELECT tablename, 
       COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
       COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
       COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
       COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;
```

---

## Performance Optimization

### Indexes

Current indexes provide optimal performance:

```sql
-- Messages table
idx_messages_user_id        -- Fast user lookup
idx_messages_created_at     -- Fast chronological queries

-- MCP connections table
idx_mcp_connections_user_id -- Fast user lookup
idx_mcp_connections_active  -- Fast active connection queries
```

### Query Optimization

```sql
-- ✅ Good: Uses index
SELECT * FROM messages 
WHERE user_id = 'xxx' 
ORDER BY created_at DESC;

-- ✅ Good: Uses composite index
SELECT * FROM mcp_connections
WHERE user_id = 'xxx' AND is_active = true;

-- ❌ Avoid: Full table scan
SELECT * FROM messages 
WHERE content LIKE '%search%';
```

### Monitor Performance

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Troubleshooting

### Common Issues

**Problem:** "permission denied for table messages"

**Solution:**
```sql
-- Verify RLS policies exist
SELECT * FROM pg_policies WHERE tablename = 'messages';

-- Check if user is authenticated
SELECT auth.uid(); -- Should return user UUID, not null
```

**Problem:** "duplicate key value violates unique constraint"

**Solution:**
```sql
-- Check existing connection
SELECT * FROM mcp_connections
WHERE user_id = 'xxx' AND server_name = 'google-analytics';

-- Update instead of insert, or delete first
```

**Problem:** Slow queries

**Solution:**
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM messages WHERE user_id = 'xxx';

-- Rebuild indexes if needed
REINDEX TABLE messages;
```

---

## Development Workflow

### Local Development

```sql
-- Quick stats during development
SELECT 
  'messages' as table_name,
  COUNT(*) as count
FROM messages
UNION ALL
SELECT 
  'mcp_connections',
  COUNT(*)
FROM mcp_connections;

-- Clear test data
DELETE FROM messages WHERE user_id = 'test-user-id';
DELETE FROM mcp_connections WHERE user_id = 'test-user-id';
```

### Testing

```sql
-- Create test user (via Supabase Auth UI or API)
-- Then verify RLS
SET request.jwt.claim.sub = 'test-user-id';

-- Should only see test user's data
SELECT * FROM messages;
SELECT * FROM mcp_connections;
```

---

## API Integration

### From Application Code

```typescript
// Use Supabase client (handles RLS automatically)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
)

// Queries automatically scoped to authenticated user
const { data } = await supabase
  .from('messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)
```

### Direct SQL (Admin Only)

```sql
-- Only for admin/debugging
-- Bypass RLS with service role key
SELECT * FROM messages LIMIT 100;
```

---

## Migration Guide

### Adding New Columns

```sql
-- Add column
ALTER TABLE messages ADD COLUMN metadata JSONB;

-- Add index if needed
CREATE INDEX idx_messages_metadata ON messages USING GIN (metadata);

-- Update RLS policies if column needs protection
-- (Usually inherited from existing policies)
```

### Schema Changes

```sql
-- Always wrap in transaction
BEGIN;

-- Make changes
ALTER TABLE ...

-- Verify
SELECT * FROM information_schema.columns 
WHERE table_name = 'your_table';

-- Commit or rollback
COMMIT; -- or ROLLBACK;
```

---

## Resources

- [Supabase SQL Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Schema](../database/schema.sql)


