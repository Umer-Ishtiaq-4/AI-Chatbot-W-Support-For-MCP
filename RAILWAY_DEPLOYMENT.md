# 🚂 Railway Deployment Guide

This guide will help you deploy your MCP-enabled GA4/GSC Chatbot to Railway.

## Prerequisites

✅ GitHub account with this repository  
✅ Railway account (sign up at [railway.app](https://railway.app))  
✅ All environment variables ready (see `env.example`)  
✅ Google OAuth credentials configured  

## Quick Start

### Step 1: Create Railway Project

**Option A: Via Web (Recommended)**

1. Go to [https://railway.app/new](https://railway.app/new)
2. Click "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub account
4. Select this repository
5. Click "Deploy Now"

**Option B: Via CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Step 2: Configure Environment Variables

In Railway Dashboard → Your Project → Variables tab, add these variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_REDIRECT_URI=https://your-app.up.railway.app/api/auth/google/callback

# OpenAI
OPENAI_API_KEY=sk-...

# Optional
GOOGLE_PROJECT_ID=your-project-id
```

### Step 3: Generate Railway Domain

1. Railway Dashboard → Settings → Domains
2. Click "Generate Domain"
3. Copy the generated URL (e.g., `your-app.up.railway.app`)

### Step 4: Update Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   ```
   https://your-app.up.railway.app/api/auth/google/callback
   ```
4. Save changes

### Step 5: Update Environment Variable

Back in Railway Dashboard → Variables:

Update `NEXT_PUBLIC_REDIRECT_URI` with your Railway domain:
```env
NEXT_PUBLIC_REDIRECT_URI=https://your-app.up.railway.app/api/auth/google/callback
```

Railway will automatically redeploy when you save.

### Step 6: Verify Deployment

1. **Check Build Logs**
   - Railway Dashboard → Deployments → Latest deployment
   - Look for:
     ```
     ✓ analytics-mcp installed successfully
     ✓ Building Next.js application
     ✓ Build completed
     ✓ Server listening on port 3000
     ```

2. **Test Application**
   - Visit: `https://your-app.up.railway.app`
   - Login with your credentials
   - Navigate to `/chat`

3. **Test GA4 Connection**
   - Click "Connections" → "Connect" for GA4
   - Complete OAuth flow
   - Should see "Successfully connected to Google Analytics 4!"

4. **Test Chat with MCP**
   - Send message: "Show me GA4 page views for last 7 days"
   - Check Railway logs for MCP server startup
   - Verify response with actual data

## Architecture on Railway

### File Structure
```
/app/                          # Railway app directory (writable)
├── .next/                     # Next.js build output
├── node_modules/              # Node.js dependencies
├── mcp-credentials/           # User credential files (created at runtime)
│   └── {userId}-{service}.json
└── .local/bin/                # pipx binaries
    └── analytics-mcp          # Python MCP server
```

### Process Management

Railway runs your app as a **single long-running Node.js process**:

```
Railway Container
└── Node.js Server (next start)
    ├── Per-user MCP subprocesses:
    │   ├── analytics-mcp (Python) for User A
    │   ├── mcp-server-gsc (Node.js) for User A
    │   ├── analytics-mcp (Python) for User B
    │   └── ...
    └── Connection Pool manages all subprocesses
```

## Troubleshooting

### Issue: `analytics-mcp: command not found`

**Cause:** pipx installation failed during build

**Solution:**

Check build logs for errors. If needed, update `nixpacks.toml`:

```toml
[phases.install]
cmds = [
  'npm ci',
  'pip install pipx',
  'export PIPX_HOME=/app/.pipx',
  'export PIPX_BIN_DIR=/app/.local/bin',
  'mkdir -p /app/.local/bin',
  'pipx install analytics-mcp',
  'ls -la /app/.local/bin'  # Verify installation
]
```

### Issue: OAuth redirect mismatch

**Cause:** Redirect URI doesn't match Google OAuth console

**Solution:**

1. Check Railway domain is correct
2. Verify `NEXT_PUBLIC_REDIRECT_URI` matches exactly
3. Ensure no trailing slashes
4. Wait a few minutes for Google OAuth cache to clear

### Issue: Credentials file write error

**Cause:** Wrong path or permissions

**Solution:**

Check Railway logs. The app should log:
```
Created credentials directory at: /app/mcp-credentials
```

If you see `/var/task` or other paths, the environment detection failed.

### Issue: MCP connection fails

**Cause:** Multiple possible reasons

**Debug steps:**

1. **Check Railway logs:**
   ```bash
   railway logs
   ```

2. **Look for:**
   - "Starting GA4 MCP server with persistent credentials"
   - "Successfully connected to GA4 MCP server"
   - Any error messages

3. **Common fixes:**
   - Restart deployment: Railway Dashboard → Deployments → Redeploy
   - Clear connection: Disconnect and reconnect GA4/GSC
   - Check credentials in Supabase `mcp_connections` table

### Issue: Slow response times

**Cause:** Cold starts or connection pooling issues

**Solution:**

- First request after idle: 3-5 seconds (normal)
- Subsequent requests: < 1 second
- If consistently slow, upgrade to Railway Pro for better resources

## Monitoring

### View Logs

**Via Dashboard:**
Railway Dashboard → Deployments → Logs

**Via CLI:**
```bash
railway logs --follow
```

### Check Metrics

Railway Dashboard → Metrics:
- **CPU:** Should be low, spikes during MCP startup
- **Memory:** 500MB-1GB with active connections
- **Network:** Depends on GA4 API usage

### Important Logs to Monitor

```
# Successful MCP connection
✓ Starting GA4 MCP server with persistent credentials: /app/mcp-credentials/...
✓ Successfully connected to GA4 MCP server

# Tool execution
Tool called: get_report
Tool result received from google-analytics: ...

# Connection cleanup
Closed active connection for google-analytics, user: ...
```

## Costs & Scaling

### Free Tier (Starter)
- **Execution Hours:** 500/month
- **Good for:** Development, testing, low traffic
- **Limits:** Auto-sleep after inactivity

### Pro Plan ($5/month)
- **Execution Hours:** Unlimited
- **Good for:** Production use
- **Benefits:**
  - No sleep
  - Better performance
  - Priority support
  - Custom domains

### Estimate for Your App

**Active Users:**
- 10 concurrent users: ~200 hours/month ✅ Free tier OK
- 50+ concurrent users: Pro plan recommended

**Memory Usage:**
- Each user with both services: ~150 MB
- 10 users: ~1.5 GB total
- Railway provides up to 8 GB on Pro

## Custom Domain (Optional)

### Add Custom Domain

1. Railway Dashboard → Settings → Domains
2. Click "Custom Domain"
3. Enter your domain: `chatbot.yourdomain.com`

### Update DNS

Add CNAME record:
```
Type: CNAME
Name: chatbot
Value: your-app.up.railway.app
TTL: 3600
```

### Update Environment Variables

```env
NEXT_PUBLIC_REDIRECT_URI=https://chatbot.yourdomain.com/api/auth/google/callback
```

Update Google OAuth Console with new redirect URI.

## Backups & Persistence

### Credential Files

Stored in `/app/mcp-credentials/` which persists across deployments.

**However:** Railway can reset `/app` on container rebuilds.

**Recommendation:**
- Credentials are also stored in Supabase `mcp_connections` table
- On connection check, files are recreated if missing
- Consider enabling Railway persistent volumes for critical data

### Database

- Supabase handles all database backups
- No action needed on Railway side

## Support

### Railway Support
- Docs: [docs.railway.app](https://docs.railway.app)
- Discord: [railway.app/discord](https://railway.app/discord)
- Priority support with Pro plan

### Application Issues
- Check Railway logs first
- Review MCP connection status in `/chat`
- Verify environment variables

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Monitor logs for first few connections
3. ✅ Set up error tracking (Sentry, LogRocket, etc.)
4. ✅ Configure custom domain
5. ✅ Upgrade to Pro if needed
6. ✅ Set up CI/CD for automatic deployments

---

**Your app is now running on Railway with full MCP support! 🎉**

