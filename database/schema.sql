-- Create messages table to store chat messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own messages
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own messages
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- Create MCP connections table to store user's MCP server credentials
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

-- Create index for faster MCP connection queries
CREATE INDEX IF NOT EXISTS idx_mcp_connections_user_id ON mcp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_active ON mcp_connections(user_id, is_active);

-- Enable Row Level Security for MCP connections
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own MCP connections
CREATE POLICY "Users can view own MCP connections" ON mcp_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own MCP connections
CREATE POLICY "Users can insert own MCP connections" ON mcp_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own MCP connections
CREATE POLICY "Users can update own MCP connections" ON mcp_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own MCP connections
CREATE POLICY "Users can delete own MCP connections" ON mcp_connections
  FOR DELETE USING (auth.uid() = user_id);

