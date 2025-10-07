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

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
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
```

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

