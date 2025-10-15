# 🚀 Railway Deployment Checklist

## ✅ Changes Made (Automatically)

I've prepared your application for Railway deployment:

### Files Created:
- ✅ `nixpacks.toml` - Railway build configuration
- ✅ `.railwayignore` - Files to exclude from deployment
- ✅ `RAILWAY_DEPLOYMENT.md` - Complete deployment guide
- ✅ `DEPLOYMENT_CHECKLIST.md` - This file

### Files Modified:
- ✅ `package.json` - Added postinstall script for analytics-mcp, Node.js version requirements, and PORT binding
- ✅ `lib/mcp/credential-manager.ts` - Railway-safe credential paths (/app directory)
- ✅ `env.example` - Added Railway deployment notes

## 📋 Your Action Items

### Step 1: Commit Changes
```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### Step 2: Create Railway Account
1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway to access your repositories

### Step 3: Deploy to Railway

**Via Web (Easiest):**
1. Click "Start a New Project"
2. Select "Deploy from GitHub repo"
3. Choose this repository
4. Click "Deploy Now"

**Via CLI:**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Step 4: Generate Domain
1. Railway Dashboard → Settings
2. Under "Domains" → Click "Generate Domain"
3. Copy the URL (e.g., `your-app.up.railway.app`)

### Step 5: Configure Environment Variables

In Railway Dashboard → Variables tab, add:

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Required - Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
NEXT_PUBLIC_REDIRECT_URI=https://your-app.up.railway.app/api/auth/google/callback

# Required - OpenAI
OPENAI_API_KEY=sk-...

# Optional
GOOGLE_PROJECT_ID=your-project-id
```

**⚠️ IMPORTANT:** Replace `your-app.up.railway.app` with your actual Railway domain!

### Step 6: Update Google OAuth Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs":
   ```
   https://your-app.up.railway.app/api/auth/google/callback
   ```
4. Click "Save"

### Step 7: Verify Deployment

1. **Check Build Logs:**
   - Railway Dashboard → Deployments → Latest
   - Look for:
     - ✅ "analytics-mcp installed successfully"
     - ✅ "Build completed"
     - ✅ "Server listening on port 3000"

2. **Test Application:**
   - Visit your Railway URL
   - Login to your account
   - Navigate to `/chat`
   - Click "Connections" → Connect to GA4
   - Complete OAuth flow
   - Send a test message

3. **Verify MCP Works:**
   - Ask: "Show me GA4 page views for last 7 days"
   - Check logs for MCP server startup
   - Verify you get actual data

## 🔍 Verification Commands

### Check Railway Logs
```bash
railway logs --follow
```

### Successful Deployment Should Show:
```
✓ Starting build...
✓ Installing dependencies
✓ analytics-mcp installed successfully
✓ Building Next.js application
✓ Build completed
✓ Starting server on port 3000
✓ Ready on http://0.0.0.0:3000
```

### When User Connects GA4:
```
Created credentials directory at: /app/mcp-credentials
Starting GA4 MCP server with persistent credentials: /app/mcp-credentials/xxx-google-analytics.json
Successfully connected to GA4 MCP server
```

## ⚠️ Common Issues & Fixes

### Issue: "analytics-mcp: command not found"
**Fix:** Redeploy from Railway dashboard. Check build logs for pipx errors.

### Issue: OAuth redirect mismatch
**Fix:** 
1. Verify Railway domain matches `NEXT_PUBLIC_REDIRECT_URI`
2. Check Google OAuth console has exact redirect URI
3. No trailing slashes!

### Issue: "read-only file system" error
**Fix:** Should NOT happen now. `credential-manager.ts` uses `/app` directory.
If you see this, check Railway logs for the credentials path being used.

### Issue: MCP connection times out
**Fix:**
1. Check Railway logs for Python errors
2. Verify environment variables are set
3. Try disconnecting and reconnecting from UI

## 📊 Expected Performance

- **Initial deployment:** 8-12 minutes
- **Subsequent deploys:** 3-5 minutes
- **Cold start (first request):** 3-5 seconds
- **Warm requests:** < 1 second
- **Memory usage:** 500MB-1GB

## 💰 Cost Estimate

**Free Tier:**
- 500 execution hours/month
- Perfect for development & testing
- Sleeps after inactivity

**Pro Plan ($5/month):**
- Unlimited execution hours
- No sleep
- Better performance
- Recommended for production

**Your Usage:**
- 10 concurrent users ≈ 200 hours/month ✅ Free tier OK
- 50+ users → Consider Pro plan

## 🎯 Success Criteria

You'll know deployment is successful when:

- ✅ Railway build completes without errors
- ✅ Application loads at Railway URL
- ✅ Login works correctly
- ✅ GA4/GSC connection via OAuth succeeds
- ✅ Chat responds to questions
- ✅ MCP tools return real data from GA4/GSC
- ✅ No errors in Railway logs

## 📚 Additional Resources

- **Full Guide:** See `RAILWAY_DEPLOYMENT.md`
- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Railway Discord:** [railway.app/discord](https://railway.app/discord)
- **Support:** Railway Dashboard → Help

## 🚀 Ready to Deploy?

**Quick Start:**
```bash
# 1. Commit changes
git add .
git commit -m "Add Railway deployment config"
git push

# 2. Deploy to Railway
# Go to railway.app → Deploy from GitHub → Select repo

# 3. Add environment variables in Railway dashboard

# 4. Update Google OAuth redirect URI

# 5. Test your app!
```

---

**Need help?** Check `RAILWAY_DEPLOYMENT.md` for detailed troubleshooting steps.

**Good luck with your deployment! 🎉**

