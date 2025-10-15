# Production Deployment Guide

Complete guide to deploying your AI Chatbot with GA4 and GSC integration to production.

## 📋 Pre-Deployment Checklist

### ✅ Code Preparation
- [x] All security vulnerabilities fixed
- [x] Build verification passed (`npm run build`)
- [x] TypeScript compilation successful
- [x] Linter passes with no errors
- [x] Unused code removed

### ⚠️ Configuration Required
- [ ] Production environment variables configured
- [ ] Google Cloud APIs enabled
- [ ] OAuth redirect URIs updated
- [ ] Database schema deployed
- [ ] MCP servers tested

### 🔐 Security Checklist
- [x] Authentication enforced on all routes
- [x] Bearer token validation implemented
- [x] Row Level Security enabled
- [x] Credentials stored securely server-side
- [x] No sensitive data in client code
- [ ] HTTPS enabled (platform handles this)
- [ ] Rate limiting configured (optional but recommended)

---

## 🚀 Deployment Options

### Option 1: Vercel (Easiest)

**Best for:** Quick deployment, zero configuration

#### Steps:
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository
   - Vercel auto-detects Next.js settings

3. **Configure Environment Variables**
   
   In Vercel dashboard, add these:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_production_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
   GOOGLE_PROJECT_ID=your_project_id
   ```

4. **Click Deploy** → Done!

⚠️ **MCP Server Limitation:** Vercel serverless functions may have limited support for process spawning. Consider Railway for full MCP support.

---

### Option 2: Railway (Best for MCP Servers) ⭐ RECOMMENDED

**Best for:** Full Node.js environment, MCP server support

#### Why Railway?
- ✅ Full process spawning support (Python & Node.js)
- ✅ MCP servers work perfectly
- ✅ Persistent filesystem for credentials
- ✅ Easy deployment from GitHub
- ✅ Free tier available

#### Steps:
1. **Sign Up**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Build Settings**
   Railway auto-detects Next.js, but you can specify:
   ```
   Build Command: npm run build
   Start Command: npm start
   ```

4. **Add Environment Variables**
   
   In Railway dashboard → Variables tab:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_production_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_REDIRECT_URI=https://your-app.railway.app/api/auth/google/callback
   GOOGLE_PROJECT_ID=your_project_id
   ```

5. **Deploy**
   - Railway builds and deploys automatically
   - Get your app URL from the dashboard

6. **Install MCP Servers** (if not in Docker)
   
   Railway provides a persistent environment where you can:
   ```bash
   # GA4 MCP (Python)
   pip install analytics-mcp
   
   # GSC MCP installs automatically via npx
   ```

**Pricing:** Free tier with $5 credit/month, then ~$10-20/month

---

### Option 3: Netlify

**Best for:** Alternative to Vercel

#### Steps:
1. **Deploy**
   - Go to [netlify.com](https://netlify.com)
   - "Add new site" → "Import an existing project"
   - Connect GitHub repo

2. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: .next
   ```

3. **Environment Variables**
   
   Add in Netlify dashboard → Site settings → Environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   OPENAI_API_KEY=your_key
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_id
   GOOGLE_CLIENT_SECRET=your_secret
   NEXT_PUBLIC_REDIRECT_URI=https://your-app.netlify.app/api/auth/google/callback
   GOOGLE_PROJECT_ID=your_project
   ```

4. **Deploy** → Netlify builds automatically

⚠️ **Note:** Limited MCP server support, may need workarounds

---

## 🔧 Google Cloud Configuration

### 1. Enable Required APIs

Go to [Google Cloud Console](https://console.cloud.google.com):

1. **Google Analytics Data API**
   - Navigate to APIs & Services → Library
   - Search "Google Analytics Data API"
   - Click Enable

2. **Google Analytics Admin API**
   - Search "Google Analytics Admin API"
   - Click Enable

3. **Google Search Console API**
   - Search "Search Console API"
   - Click Enable

### 2. Configure OAuth 2.0

1. **Go to Credentials**
   - APIs & Services → Credentials

2. **Edit Your OAuth Client**
   - Find your OAuth 2.0 Client ID
   - Click Edit

3. **Add Production Redirect URI**
   ```
   # Add this to Authorized redirect URIs:
   https://your-production-domain.com/api/auth/google/callback
   
   # Examples:
   https://myapp.vercel.app/api/auth/google/callback
   https://myapp.railway.app/api/auth/google/callback
   https://myapp.netlify.app/api/auth/google/callback
   ```

4. **Save Changes**

### 3. OAuth Consent Screen

Ensure your OAuth consent screen is configured:
- App name
- User support email
- Developer contact information
- Scopes requested (GA4 + GSC)

For production, consider verifying your app.

---

## 🗄️ Database Setup

### Create Production Database

1. **Go to Supabase Dashboard**
   - [app.supabase.com](https://app.supabase.com)
   - Select your production project (or create new)

2. **Run Database Schema**
   - Navigate to SQL Editor
   - Click "New Query"
   - Copy entire contents of `database/schema.sql`
   - Click Run

3. **Verify Tables Created**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   
   Should see:
   - `messages`
   - `mcp_connections`

4. **Verify RLS Policies**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

---

## 🔐 Environment Variables Reference

### Production Environment Variables

Create `.env.local` (or configure in platform dashboard):

```bash
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Public key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...     # Secret key (server-side only!)

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Google OAuth (Production)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...          # Keep secret!
NEXT_PUBLIC_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
GOOGLE_PROJECT_ID=your-gcp-project-id
```

### ⚠️ Security Notes:
- **Never commit** `.env.local` to Git
- **NEXT_PUBLIC_*** variables are exposed to browser
- **Service role keys** are for server-side only
- **Rotate secrets** periodically

---

## 🧪 Post-Deployment Testing

### 1. Authentication Flow
```bash
# Test signup
1. Go to /login
2. Create new account
3. Check email for confirmation
4. Verify login works

# Test session
1. Login successfully
2. Refresh page → should stay logged in
3. Logout → should redirect to /login
```

### 2. Google Analytics Connection
```bash
1. Click "Connections" → "Connect" on GA4
2. Authorize with Google account
3. Should see success message
4. Ask: "Show me my GA4 accounts"
5. Verify data returns correctly
```

### 3. Search Console Connection
```bash
1. Click "Connections" → "Connect" on GSC
2. Authorize with Google account
3. Should see success message
4. Ask: "What are my top search queries?"
5. Verify data returns correctly
```

### 4. Agent Loop Testing
```bash
# Test multi-step queries
Ask: "Compare my traffic from last week to this week"

Expected:
- Multiple tool calls visible in console
- Final response with comparison
- No errors in browser console
```

### 5. Error Handling
```bash
# Test error scenarios
1. Try accessing /chat without login → should redirect
2. Try disconnecting service → should work cleanly
3. Check browser console for errors → should be none
```

---

## 📊 Monitoring & Logging

### Application Logs

**Vercel:**
- Dashboard → Your Project → Logs
- Real-time function logs
- Error tracking built-in

**Railway:**
- Project → Deployments → View Logs
- Persistent logs
- Download for analysis

**Netlify:**
- Site → Functions → Logs
- Function execution logs

### Important Logs to Monitor

```bash
# Authentication
"Chat request - User: xxx, GA4 Connected: true"
"OAuth tokens received for service: ga4"

# MCP Connections
"Created new MCP connection for user xxx"
"Dynamically loaded GA4 tools: [...]"

# Errors to watch for
"Failed to connect to GA MCP server"
"Credentials not found for user"
"OAuth callback error"
```

### Database Monitoring

```sql
-- Check active connections
SELECT COUNT(*) as active_connections
FROM mcp_connections 
WHERE is_active = true;

-- User activity
SELECT 
  DATE(created_at) as date,
  COUNT(*) as messages
FROM messages
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Connection stats by service
SELECT 
  server_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM mcp_connections
GROUP BY server_name;
```

---

## 🐛 Troubleshooting

### MCP Server Issues

**Problem:** GA4 queries fail with "MCP server not found"

**Solution:**
```bash
# Verify Python MCP server installed
which analytics-mcp  # Should show path

# If missing, install:
pipx install analytics-mcp

# Check environment variable
echo $GOOGLE_APPLICATION_CREDENTIALS
```

**Problem:** GSC queries fail

**Solution:**
```bash
# GSC uses npx, ensure Node.js available
node --version  # Should be 18+

# Test manually
npx -y mcp-server-gsc
```

### OAuth Issues

**Problem:** "Redirect URI mismatch" error

**Solution:**
1. Check `.env.local` has correct `NEXT_PUBLIC_REDIRECT_URI`
2. Verify Google Cloud Console has exact same URI
3. Must match exactly (https vs http, trailing slash, etc.)

**Problem:** "Invalid client" error

**Solution:**
1. Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is correct
2. Verify `GOOGLE_CLIENT_SECRET` is correct
3. Check OAuth client is enabled in Google Cloud

### Database Issues

**Problem:** "User not found" or "Unauthorized" errors

**Solution:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verify policies exist
SELECT * FROM pg_policies 
WHERE schemaname = 'public';
```

### Performance Issues

**Problem:** Slow response times

**Solution:**
1. Check connection pool stats
2. Verify credentials are persisted (not recreating each time)
3. Monitor database query performance
4. Check OpenAI API response times

---

## 🔄 Continuous Deployment

### Automatic Deployments

All platforms support automatic deployment:

**Setup:**
1. Connect GitHub repository
2. Enable auto-deploy on push
3. Select branch (usually `main`)

**Workflow:**
```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# Platform auto-deploys
# Monitor deployment in dashboard
# Test production URL
```

---

## 💰 Cost Estimation

### Monthly Costs (Approximate)

**Hosting:**
- **Vercel:** Free tier → $20/month (Pro)
- **Railway:** $5 free → $10-20/month
- **Netlify:** Free tier → $19/month (Pro)

**Services:**
- **Supabase:** Free tier → $25/month (Pro)
- **OpenAI API:** Pay-per-use (~$0.01-0.03 per conversation)
- **Google APIs:** Free (within quotas)

**Total estimated:** $0-$70/month depending on usage and tiers

### Cost Optimization

1. **Use free tiers** for testing/small scale
2. **Monitor OpenAI token usage** (biggest variable cost)
3. **Set up billing alerts** in each platform
4. **Optimize agent iterations** (reduce tool calls)
5. **Cache frequent queries** when possible

---

## 🎯 Production Best Practices

### Security
- [ ] Enable HTTPS (automatic on all platforms)
- [ ] Rotate secrets regularly
- [ ] Monitor failed login attempts
- [ ] Set up rate limiting (via platform)
- [ ] Regular security audits

### Performance
- [ ] Monitor API response times
- [ ] Track connection pool efficiency
- [ ] Optimize database queries
- [ ] Cache static assets
- [ ] Use CDN for media files

### Reliability
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure error alerting
- [ ] Database backups (Supabase auto-backs up)
- [ ] Document recovery procedures
- [ ] Have rollback plan

### Monitoring
- [ ] Application logs reviewed daily
- [ ] Database performance monitored
- [ ] User feedback collected
- [ ] API usage tracked
- [ ] Cost monitoring enabled

---

## 📞 Support Resources

### Platform Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Netlify Docs](https://docs.netlify.com)
- [Supabase Docs](https://supabase.com/docs)

### API Documentation
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Search Console API](https://developers.google.com/webmaster-tools)
- [OpenAI API](https://platform.openai.com/docs)

### MCP Resources
- [MCP Specification](https://modelcontextprotocol.io)
- [Google Analytics MCP](https://github.com/googleanalytics/google-analytics-mcp)

---

## ✅ Deployment Complete!

Once deployed and tested:

1. ✅ Update DNS if using custom domain
2. ✅ Set up SSL certificate (auto with platforms)
3. ✅ Configure monitoring and alerts
4. ✅ Document your deployment for team
5. ✅ Monitor closely for first 24-48 hours
6. ✅ Gather user feedback
7. ✅ Plan for scaling if needed

**Your AI Chatbot is now live! 🎉**


