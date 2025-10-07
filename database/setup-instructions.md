# Database Setup - Step by Step

## Method 1: SQL Editor (Recommended)

1. **Go to SQL Editor**
   - Open https://app.supabase.com
   - Select your project
   - Click "SQL Editor" in left sidebar
   - Click "+ New query" button

2. **Paste and Run SQL**
   - Copy the SQL below
   - Click "Run" (or press Ctrl+Enter)
   - **IMPORTANT**: Look for success/error messages at the bottom

3. **Check for Errors**
   - If you see any RED error messages, copy them
   - Common issues:
     - Policy already exists (can ignore)
     - Permission denied (contact me)

## Method 2: Table Editor (Visual)

If SQL Editor doesn't work, create the table manually:

1. **Go to Table Editor**
   - Click "Table Editor" in left sidebar
   - Click "+ New table" button

2. **Table Settings**
   - Name: `messages`
   - Enable Row Level Security (RLS): ✅ YES

3. **Add Columns** (click "+ Add column" for each):

   | Name | Type | Default Value | Primary | Nullable |
   |------|------|---------------|---------|----------|
   | id | uuid | gen_random_uuid() | ✅ Yes | No |
   | user_id | uuid | - | No | No |
   | role | text | - | No | No |
   | content | text | - | No | No |
   | created_at | timestamptz | now() | No | No |

4. **Add Foreign Key**
   - Click on `user_id` column
   - Under "Foreign Key Relation"
   - Select: `auth.users` → `id`
   - On Delete: Cascade

5. **Save the Table**

## Method 3: Check if Table Already Exists

Run this SQL to check:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'messages';
```

If it returns a row, the table exists but might be in a different view.

