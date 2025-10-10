# Changelog

All notable changes to the AI Chatbot with GA4 & GSC integration.

## [Unreleased]

### Planned Features
- Token auto-refresh for expired access tokens
- Connection health checks
- Usage metrics dashboard
- Additional MCP server integrations
- Multi-language support

---

## [3.0.0] - 2025-10-10 - Production Ready 🚀

### 🔴 Critical Security Fixes
- **FIXED: Authentication bypass vulnerability** in `/api/chat` endpoint
  - Added Bearer token authentication
  - Extract userId from verified session tokens
  - Removed client-provided userId from request body
- **FIXED: Disconnect endpoint vulnerability** in `/api/auth/google/disconnect`
  - Added Bearer token authentication
  - Server-side userId validation from session
- Updated frontend to send Authorization headers with all protected requests

### ✨ New Features - Multi-Service Architecture
- **Google Search Console Integration**
  - Natural language queries for search analytics
  - Node.js MCP server via npx (auto-installs)
  - Tools: `search_analytics`, `list_sites`, quick wins detection
- **Multi-Service Query Support**
  - Query GA4 and GSC in same conversation
  - Service-independent connection management
  - Intelligent tool routing with prefixes (`ga4_*`, `gsc_*`)
- **Service Connection UI**
  - Dropdown connections menu in header
  - Independent connect/disconnect for each service
  - Real-time connection status indicators
  - Toast notifications for all actions

### 🎨 UI Improvements
- Added confirmation modals for destructive actions
- Toast notification system for user feedback
- Connection status indicators in header
- Improved error messaging
- Modern dropdown menu for service connections

### 🔧 Code Quality
- Removed 3 unused components (GA4ConnectionCard, GSCConnectionCard, ServiceConnectionCard)
- Added TypeScript `downlevelIteration` for proper Map iteration
- Fixed all type compatibility issues
- Zero build errors
- Clean linter output

### 📚 Documentation
- Complete documentation restructure (17 → 5 files)
- New `DEPLOYMENT.md` with platform-specific guides
- Consolidated technical docs in `docs/ARCHITECTURE.md`
- Streamlined database docs in `docs/DATABASE.md`
- This comprehensive CHANGELOG

### 🧪 Testing
- Production build verified
- All routes tested
- Security audit completed
- Performance benchmarks confirmed

---

## [2.0.0] - Connection Pool Optimization

### 🚀 Performance Improvements
- **40-60x faster queries** after initial connection
- **Connection Pooling System**
  - First query: ~3 seconds (creates connection)
  - Subsequent queries: ~50ms (reuses connection)
  - Automatic idle cleanup after 60 minutes
- **Persistent Credential Storage**
  - Server-side credential files (mode 0o600)
  - Database-backed with `mcp_connections` table
  - No temporary files created
  - Credentials reused across all requests

### 🏗️ Architecture Changes
- **New: Credential Manager** (`lib/mcp/credential-manager.ts`)
  - Manages OAuth tokens and credential files
  - Database persistence with RLS
  - Automatic lifecycle management
- **New: Connection Pool** (`lib/mcp/connection-pool.ts`)
  - Singleton pattern for shared connections
  - Per-user, per-service connection pooling
  - Automatic cleanup and shutdown handling
- **Updated: OAuth Flow** (`app/api/auth/google/callback/route.ts`)
  - Stores credentials server-side
  - No token exposure to frontend
  - Creates persistent credential files

### 🗄️ Database Schema
- Added `mcp_connections` table for credential storage
- Columns: id, user_id, server_name, credentials_path, tokens, is_active
- RLS policies for user isolation
- Indexes on user_id and (user_id, is_active)
- Unique constraint on (user_id, server_name)

### 🔐 Security Enhancements
- OAuth tokens never sent to frontend
- Credential files with strict permissions (0o600)
- Per-user credential isolation
- Automatic token refresh support (framework in place)
- Row Level Security on all tables

### 📝 Documentation (v2.0)
- Created comprehensive docs structure
- `docs/MCP-CONNECTION-MANAGEMENT.md` - Connection pool architecture
- `docs/OPTIMIZATION-SUMMARY.md` - Performance details
- `docs/OAUTH-FLOW.md` - Authentication process
- `docs/DATABASE-SCHEMA.md` - Database reference

---

## [1.5.0] - Agent Loop & Conversation Memory

### ✨ New Features
- **Conversation History**
  - Loads last 10 messages for context
  - Enables natural follow-up questions
  - AI remembers previous conversation
- **Agent Loop (Multi-Step Tool Calling)**
  - AI automatically chains multiple tools
  - Handles complex queries requiring multiple API calls
  - Maximum 5 iterations with safety limits
  - Intelligent decision making on when to stop

### 💡 Agent Capabilities
- Automatically determines which tools to call
- Chains queries: get accounts → get data → compare → answer
- No user intervention needed for multi-step questions
- Examples:
  - "Compare traffic from last week to this week"
  - "Show me top pages and their bounce rates"
  - "What's my busiest day this month?"

### 🔧 Implementation
- Updated `/api/chat` route with agent loop logic
- OpenAI function calling with auto mode
- Conversation history passed with each request
- Tool results fed back to AI for next decision

---

## [1.0.0] - Initial Release

### ✨ Core Features
- **AI Chat Interface**
  - Next.js 14 with App Router
  - Beautiful gradient UI with Tailwind CSS
  - Real-time chat with GPT-4o
  - Message typing indicators
  - Responsive design (80% width on desktop)

### 🔐 Authentication
- Email/Password authentication via Supabase
- Secure session management
- Protected routes
- Automatic login redirect

### 📊 Google Analytics 4 Integration
- OAuth 2.0 authorization flow
- Official Google Analytics MCP Server integration
- Dynamic tool loading from MCP server
- Available tools:
  - `get_account_summaries`
  - `get_property_details`
  - `run_report`
  - `run_realtime_report`
  - `get_custom_dimensions_and_metrics`
  - `list_google_ads_links`

### 🗄️ Database (Supabase)
- PostgreSQL with Row Level Security
- `messages` table for chat history
- User isolation with RLS policies
- Indexes for performance

### 🏗️ Architecture
- MCP (Model Context Protocol) integration
- Python MCP server for GA4 (`analytics-mcp`)
- Stdio transport for server communication
- Tool-based AI interactions

### 📚 Documentation
- Main README with setup instructions
- GA4 MCP setup guide
- Architecture overview
- Environment variable documentation

---

## Version History Summary

| Version | Release Date | Key Features |
|---------|-------------|--------------|
| 3.0.0 | 2025-10-10 | Multi-service (GSC), Security fixes, Production ready |
| 2.0.0 | - | Connection pooling, 40-60x performance boost |
| 1.5.0 | - | Agent loop, Conversation memory |
| 1.0.0 | - | Initial release with GA4 integration |

---

## Performance Metrics

### v3.0 (Current)
- First GA4 query: ~3s (connection creation)
- Subsequent queries: ~50ms (connection reuse)
- Multi-service queries: ~100-200ms
- **40-60x faster** than v1.0

### Resource Usage
- 99% reduction in process spawning (vs v1.0)
- 100% elimination of temporary files
- Automatic idle connection cleanup
- Optimized database queries with indexes

---

## Migration Guides

### Upgrading from v2.0 to v3.0

1. **Pull latest code**
   ```bash
   git pull origin main
   npm install
   ```

2. **No database changes needed**
   - `mcp_connections` table already supports multi-service

3. **Update environment variables** (if needed)
   - OAuth scopes now include GSC automatically
   - No changes required to `.env.local`

4. **Security: Critical Updates**
   - Frontend now sends Authorization headers
   - Backend validates session tokens
   - Users must be logged in to use services

5. **Test**
   - Login and verify session works
   - Connect GA4 and test queries
   - Connect GSC and test queries
   - Test multi-service queries

### Upgrading from v1.x to v2.0

1. **Database Migration Required**
   ```sql
   -- Run in Supabase SQL Editor
   -- Copy from database/schema.sql
   CREATE TABLE IF NOT EXISTS mcp_connections (...);
   ```

2. **Reconnect existing users**
   - Users must disconnect and reconnect GA4
   - Creates persistent credentials

3. **Update environment variables**
   ```env
   GOOGLE_PROJECT_ID=your-project-id
   ```

4. **Clear old data** (optional)
   ```bash
   # Remove old localStorage tokens
   localStorage.removeItem('ga4_access_token')
   localStorage.removeItem('ga4_refresh_token')
   ```

---

## Breaking Changes

### v3.0
- ⚠️ API routes now require Bearer token in Authorization header
- ⚠️ Frontend must send session token with all protected requests
- ⚠️ UserId no longer accepted from client request body

### v2.0
- ⚠️ OAuth tokens no longer stored in localStorage
- ⚠️ Requires database migration (new table)
- ⚠️ Existing connections must be re-established
- ⚠️ MCP credentials now stored server-side only

### v1.5
- Changed: Max conversation history from unlimited to last 10 messages
- Changed: Tool calling now uses agent loop (may affect timing)

---

## Contributors

Special thanks to all contributors and the open-source projects that made this possible:
- [Google Analytics MCP Server](https://github.com/googleanalytics/google-analytics-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Supabase](https://supabase.com)
- [OpenAI](https://openai.com)

---

## Support

For questions or issues:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
2. Review [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for technical details
3. Consult [docs/DATABASE.md](./docs/DATABASE.md) for database issues
4. Open an issue on GitHub

---

**Current Status: Production Ready ✅**

