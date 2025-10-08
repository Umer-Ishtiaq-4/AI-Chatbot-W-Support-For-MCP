# AI Chatbot with Next.js

A simple chatbot application built with Next.js, Supabase, and OpenAI GPT-4o.

## Features

- Email and Password authentication
- Real-time chat with GPT-4o
- Chat history saved to Supabase PostgreSQL
- Beautiful, modern UI with gradient colors
- Responsive design (80% width on desktop screens)
- Smooth animations and transitions
- Message typing indicators
- **Google Analytics 4 Integration** - Query your analytics data through natural language
- MCP (Model Context Protocol) support for extensible integrations

## Setup Instructions

### 1. Install Dependencies

#### Install Node.js dependencies:
```bash
npm install
```

#### Install Google Analytics MCP Server (Python):

The chatbot uses the official [Google Analytics MCP Server](https://github.com/googleanalytics/google-analytics-mcp) to query GA4 data.

**Install pipx (Python package runner):**

Windows:
```powershell
python -m pip install --user pipx
python -m pipx ensurepath
```

macOS/Linux:
```bash
python3 -m pip install --user pipx
python3 -m pipx ensurepath
```

**Restart your terminal**, then install the GA4 MCP server:
```bash
pipx install analytics-mcp
```

Verify installation:
```bash
pipx run analytics-mcp --help
```

### 2. Configure Environment Variables

You need to add your Supabase Anon Key and OpenAI API Key to the `.env.local` file:

**Get Supabase Anon Key:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings > API
4. Copy the `anon` `public` key

**Get OpenAI API Key:**
1. Go to https://platform.openai.com
2. Navigate to API Keys
3. Create a new secret key

Edit `.env.local` and replace the placeholder values:
```
NEXT_PUBLIC_SUPABASE_URL=https://micnwaorxchrnvaeiigz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
SUPABASE_DATABASE_URL=postgresql://postgres:5!k4Gj7ajPe*viV@db.micnwaorxchrnvaeiigz.supabase.co:5432/postgres
OPENAI_API_KEY=your_actual_openai_api_key

# Google OAuth Configuration (for GA4 integration)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_PROJECT_ID=your-google-cloud-project-id
```

**Get Google OAuth Credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the following APIs:
   - Google Analytics Data API
   - Google Analytics Admin API (required for listing accounts/properties)
4. Go to Credentials > Create Credentials > OAuth client ID
5. Application type: Web application
6. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
7. Copy the Client ID and Client Secret

### 3. Set Up Database

1. Go to your Supabase project: https://app.supabase.com
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `database/schema.sql`
5. Click "Run" to execute the SQL

This will create:
- `messages` table to store chat messages
- Row Level Security policies to protect user data
- Indexes for better performance

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign Up**: Create a new account with email and password
2. **Login**: Sign in with your credentials
3. **Chat**: Start chatting with the AI
4. **Clear Chat**: Clear all your messages
5. **Logout**: Sign out of your account

### Google Analytics 4 Integration

The chatbot **dynamically connects to the official Google Analytics MCP server** and retrieves available tools automatically - no hardcoding!

1. **Connect GA4**: Click the "Connect" button in the GA4 card at the top of the chat interface
2. **Authorize**: Sign in with your Google account and grant permissions
3. **Query Data**: The chatbot will use the official GA4 MCP tools:
   - `get_account_summaries` - "Show me my GA4 accounts and properties"
   - `get_property_details` - "Get details about property properties/123456"
   - `run_report` - "Show me traffic for the last 7 days"
   - `get_custom_dimensions_and_metrics` - "What custom dimensions do I have?"
   - `run_realtime_report` - "Show me realtime users"
   - `list_google_ads_links` - "What Google Ads accounts are linked?"

**Example queries:**
- "Show me all my Google Analytics accounts and properties"
- "Get details about my property with 'production' in the name"
- "What are my top pages in the last 30 days?"
- "Show me realtime active users"
- "What custom dimensions are configured?"

## Project Structure

```
├── app/
│   ├── api/chat/route.ts    # API endpoint for GPT-4o
│   ├── chat/page.tsx        # Chat interface
│   ├── login/page.tsx       # Authentication page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home/redirect page
│   └── globals.css          # Global styles
├── lib/
│   └── supabase.ts          # Supabase client
├── database/
│   └── schema.sql           # Database schema
└── package.json             # Dependencies
```

## Technologies

- **Next.js 14** - React framework
- **Supabase** - Authentication and PostgreSQL database
- **OpenAI GPT-4o** - AI chat completions
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Notes

- Make sure to keep your API keys secure and never commit them to version control
- The database connection string includes special characters - it's already configured correctly
- Email confirmation is required for sign up (check your email after registration)

