# 🔧 Railway MCP PATH Fix

## Issue You Encountered

```
Failed to connect to GA MCP server: Error: spawn analytics-mcp ENOENT
```

This means `analytics-mcp` was not found in the system PATH at runtime.

## What I Fixed

### 1. Updated `nixpacks.toml`
- ✅ Added explicit PATH in the start command: `PATH=/app/.local/bin:$PATH npm start`
- ✅ Added debugging commands to verify installation
- ✅ Removed variables section (wasn't working)

### 2. Updated `lib/mcp/servers/google-analytics-client.ts`
- ✅ Added Railway environment detection
- ✅ Uses explicit path on Railway: `/app/.local/bin/analytics-mcp`
- ✅ Falls back to command name for local development

### 3. Updated `package.json`
- ✅ Skips postinstall on Railway (nixpacks handles it)

## Next Steps for You

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Fix analytics-mcp PATH issue on Railway"
git push origin main
```

### Step 2: Railway Will Auto-Redeploy

Watch the build logs in Railway Dashboard → Deployments

**Look for these lines in the install phase:**
```
✓ npm ci
✓ mkdir -p /app/.local/bin
✓ pipx install analytics-mcp
✓ Successfully installed analytics-mcp
✓ /app/.local/bin/analytics-mcp --version
```

**If you see errors like:**
- `pipx: command not found` → Nixpacks setup issue
- `No module named 'analytics_mcp'` → Python package issue
- `Permission denied` → Directory permissions issue

### Step 3: Verify Runtime

After deployment, check the application logs:

**Expected:**
```
Railway environment detected, using explicit path: /app/.local/bin/analytics-mcp
Starting GA4 MCP server with persistent credentials: /app/mcp-credentials/...
Successfully connected to GA4 MCP server
```

**If you still see ENOENT:**
- The install phase failed
- Need to check build logs more carefully

## Alternative Fix: If Above Doesn't Work

If the PATH fix doesn't work, we can try a different approach:

### Option 1: Use Full Python Path

Update `nixpacks.toml`:
```toml
[phases.install]
cmds = [
  'npm ci',
  'pip install analytics-mcp',  # Use pip instead of pipx
  'which python',
  'python -m analytics_mcp --version'
]

[start]
cmd = 'npm start'
```

Then update `lib/mcp/servers/google-analytics-client.ts`:
```typescript
// On Railway, use python -m instead of direct command
if (process.env.RAILWAY_ENVIRONMENT) {
  this.transport = new StdioClientTransport({
    command: 'python',
    args: ['-m', 'analytics_mcp'],
    env
  });
} else {
  this.transport = new StdioClientTransport({
    command: 'analytics-mcp',
    args: [],
    env
  });
}
```

### Option 2: Install Globally with pip

Update `nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ['nodejs_20', 'python311', 'python311Packages.pip']

[phases.install]
cmds = [
  'npm ci',
  'pip install --user analytics-mcp',
  'export PATH=$HOME/.local/bin:$PATH',
  'analytics-mcp --version'
]
```

## Debugging Commands

If deployment succeeds but MCP still fails, you can check:

### Via Railway Dashboard → Shell

```bash
# Check if analytics-mcp exists
ls -la /app/.local/bin/

# Check if it's executable
/app/.local/bin/analytics-mcp --version

# Check PATH
echo $PATH

# Check pipx installations
pipx list
```

### Via Application Logs

The code now logs:
- `Railway environment detected, using explicit path: /app/.local/bin/analytics-mcp`
- Any spawn errors with details

## Common Causes

1. **pipx not installed properly** → Nixpacks setup phase failed
2. **analytics-mcp install failed** → Python dependency issues
3. **PATH not set at runtime** → Environment variable not persisting (we fixed this)
4. **File permissions** → /app/.local/bin not executable (rare)

## Verification Checklist

After redeployment, verify:

- [ ] Build logs show `pipx install analytics-mcp` succeeded
- [ ] Build logs show `/app/.local/bin/analytics-mcp --version` works
- [ ] Application starts without errors
- [ ] GA4 connection attempt shows "Railway environment detected"
- [ ] MCP server starts: "Successfully connected to GA4 MCP server"
- [ ] Chat requests work and call GA4 tools

## If Still Not Working

**Try Alternative Installation Methods:**

1. **Use system Python and pip** (Option 1 above)
2. **Install via npm package** (if available)
3. **Bundle Python binary** in your repo (not recommended)

**Contact me with:**
- Full build logs from Railway
- Runtime logs when attempting GA4 connection
- Output of debugging commands from Railway shell

---

**The fix should work!** The main issue was PATH not being set at runtime. Now it's explicitly set in the start command and the code uses the full path on Railway. 🚀

