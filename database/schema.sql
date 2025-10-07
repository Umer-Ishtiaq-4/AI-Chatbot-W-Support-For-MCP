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

