# AI Chatbot with Google Analytics & Search Console Integration

A powerful Next.js chatbot that integrates with OpenAI GPT-4o and connects to Google services via the Model Context Protocol (MCP). Query your Google Analytics 4 and Search Console data using natural language!

## ✨ Core Features

### 🤖 AI Chat Experience
- **GPT-4o Integration** - Powered by OpenAI's latest model
- **Conversation Memory** - Remembers last 10 messages for context-aware responses
- **Agent Loop** - Automatically chains multiple tool calls to answer complex questions
- **Beautiful Modern UI** - Gradient design with smooth animations
- **Real-time Responses** - Typing indicators and instant feedback

### 📊 Google Analytics 4 (GA4) Integration
- **Natural Language Queries** - Ask questions like "What are my top pages this week?"
- **Official MCP Server** - Uses [Google's official analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp)
- **Available Tools:**
  - `get_account_summaries` - List all GA4 accounts and properties
  - `get_property_details` - Get detailed property information
  - `run_report` - Query analytics data with dimensions and metrics
  - `run_realtime_report` - Get real-time active users
  - `get_custom_dimensions_and_metrics` - List custom dimensions
  - `list_google_ads_links` - View linked Google Ads accounts

### 🔍 Google Search Console (GSC) Integration
- **Search Analytics** - Query search performance data
- **Natural Language Interface** - Ask "What are my top search queries?"
- **NPX-Based MCP Server** - Automatically installs when needed
- **Available Tools:**
  - `search_analytics` - Get search performance metrics
  - `list_sites` - List verified properties
  - Quick wins detection and SEO insights

### 🚀 Performance Optimizations
- **Connection Pooling** - 40-60x faster queries after initial connection
- **Persistent Credentials** - Secure server-side credential storage
- **Smart Caching** - Reuses MCP connections across requests
- **Automatic Cleanup** - Idle connections closed after 60 minutes

### 🔐 Security & Authentication
- **Email/Password Auth** - Via Supabase authentication
- **Google OAuth 2.0** - Secure authorization for GA4 and GSC
- **Row Level Security** - Database-level user isolation
- **Bearer Token Validation** - All API routes properly secured

### 💾 Data Management
- **PostgreSQL Database** - Via Supabase with RLS policies
- **Chat History** - All conversations saved and retrievable
- **Multi-Service Support** - Connect GA4 and GSC independently or together
- **Credential Management** - Encrypted token storage with automatic refresh

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Python 3.8+ (for GA4 MCP server)
- Supabase account
- OpenAI API key
- Google Cloud project with APIs enabled

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-directory>

# Install Node.js dependencies
npm install
```

### 2. Install MCP Servers

#### Google Analytics MCP Server (Python)
```bash
# Install pipx
python -m pip install --user pipx
python -m pipx ensurepath

# Restart terminal, then install GA4 MCP
pipx install analytics-mcp

# Verify installation
analytics-mcp --help
```

#### Google Search Console MCP Server (Node.js)
No installation needed! The server auto-installs via `npx` when first used.

### 3. Set Up Environment Variables

Copy the example file and configure:

```bash
cp env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_PROJECT_ID=your_google_project_id
```

### 4. Configure Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. **Enable APIs:**
   - Google Analytics Data API
   - Google Analytics Admin API
   - Search Console API
4. **Create OAuth 2.0 Credentials:**
   - Go to Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
   - Copy Client ID and Client Secret to `.env.local`

### 5. Set Up Database

1. Go to your [Supabase project](https://app.supabase.com)
2. Navigate to SQL Editor
3. Copy the contents of `database/schema.sql`
4. Run the SQL to create tables and policies

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting!

## 📖 Usage Guide

### Basic Chat
1. Sign up or login with email/password
2. Type your message and press Send
3. AI responds with context from previous messages

### Connect Google Analytics 4
1. Click "Connections" in the header
2. Click "Connect" on Google Analytics 4
3. Authorize with your Google account
4. Start asking questions:
   - "Show me my GA4 accounts and properties"
   - "What are my top pages in the last 7 days?"
   - "How many active users do I have right now?"
   - "What custom dimensions are configured?"

### Connect Google Search Console
1. Click "Connections" in the header
2. Click "Connect" on Search Console
3. Authorize with your Google account
4. Ask search-related questions:
   - "What are my top search queries this month?"
   - "Show me my search performance"
   - "Which pages get the most clicks?"

### Multi-Service Queries
Once both services are connected, ask combined questions:
- "Compare my GA4 traffic with my search console clicks"
- "Show me pages with high search impressions but low GA4 sessions"

### Agent Loop in Action
The AI automatically chains multiple tool calls:

**Your question:** "Compare my traffic from last week to this week"

**Agent behavior:**
1. **Iteration 1:** Calls `get_account_summaries` to find your property
2. **Iteration 2:** Calls `run_report` for last week's data
3. **Iteration 3:** Calls `run_report` for this week's data
4. **Iteration 4:** Analyzes and provides comparison with insights

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/google/          # OAuth routes for GA4/GSC
│   │   └── chat/                 # Chat API with MCP integration
│   ├── chat/                     # Main chat interface
│   └── login/                    # Authentication page
├── components/
│   ├── Toast.tsx                 # Notification component
│   └── ConfirmModal.tsx          # Confirmation dialogs
├── lib/
│   ├── mcp/
│   │   ├── connection-pool.ts    # Connection pooling system
│   │   ├── credential-manager.ts # Credential storage
│   │   ├── client.ts             # MCP client manager
│   │   ├── registry.ts           # Server registration
│   │   └── servers/              # MCP server implementations
│   │       ├── google-analytics-client.ts
│   │       └── google-search-console-client.ts
│   ├── auth/
│   │   └── google.ts             # OAuth helpers
│   └── supabase.ts               # Supabase client
├── database/
│   └── schema.sql                # Database schema
├── docs/
│   ├── ARCHITECTURE.md           # Technical architecture
│   └── DATABASE.md               # Database documentation
├── DEPLOYMENT.md                 # Deployment guide
├── CHANGELOG.md                  # Version history
└── env.example                   # Environment template
```

## 🔧 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **AI:** OpenAI GPT-4o
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + Google OAuth 2.0
- **Styling:** Tailwind CSS
- **MCP Servers:**
  - GA4: Python (`analytics-mcp`)
  - GSC: Node.js (`mcp-server-gsc` via npx)

## 📚 Documentation

### Quick Links

| Document | Description |
|----------|-------------|
| **[README.md](./README.md)** | 👈 You are here - Main overview, features, quick start |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | 🚀 Production deployment guide (Vercel, Railway, Netlify) |
| **[CHANGELOG.md](./CHANGELOG.md)** | 📝 Version history, updates, and migration guides |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | 🏗️ Technical deep-dive: MCP, OAuth, connection pooling, agent loop |
| **[docs/DATABASE.md](./docs/DATABASE.md)** | 🗄️ Database schema, queries, and management |

### Documentation Structure

```
📦 Project Root
├── 📄 README.md              ← Start here! Features, setup, quick start
├── 📄 DEPLOYMENT.md          ← Deploy to production
├── 📄 CHANGELOG.md           ← Version history & updates
├── 📄 env.example            ← Environment variables template
├── 📂 docs/
│   ├── 📄 ARCHITECTURE.md    ← Technical architecture (MCP, OAuth, pooling)
│   └── 📄 DATABASE.md        ← Database schema & queries
└── 📂 database/
    └── 📄 schema.sql         ← SQL schema (run in Supabase)
```

## 🛡️ Security Features

- ✅ Row Level Security (RLS) on all database tables
- ✅ Bearer token authentication on all API routes
- ✅ OAuth tokens never exposed to client
- ✅ Credential files with restricted permissions (0o600)
- ✅ CSRF protection via OAuth state parameter
- ✅ User isolation - separate credentials per user
- ✅ Automatic session validation
- ✅ SQL injection prevention via Supabase ORM

## 🚀 Performance

### Connection Pooling Results
- **First GA4 query:** ~3 seconds (creates connection)
- **Subsequent queries:** ~50ms (reuses connection)
- **Performance gain:** 40-60x faster!

### Resource Management
- Automatic connection cleanup after 60 min idle
- Persistent credentials (no temp files)
- Optimized database queries with indexes
- Efficient MCP tool caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Update documentation if needed
5. Submit a pull request

## 📝 License

[Your License Here]

## 🆘 Support

For issues, questions, or contributions:
- Check [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for technical details
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
- Consult [docs/DATABASE.md](./docs/DATABASE.md) for database issues

## 🙏 Acknowledgments

- [Google Analytics MCP Server](https://github.com/googleanalytics/google-analytics-mcp) - Official GA4 integration
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [Supabase](https://supabase.com) - Backend infrastructure
- [OpenAI](https://openai.com) - GPT-4o API
