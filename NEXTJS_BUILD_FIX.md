# Next.js Build Fix for Railway Dockerfile

## Problem

The Docker build was failing with this error:

```
Error: supabaseUrl is required.
    at /app/.next/server/chunks/932.js:34:36204
```

This occurred during `npm run build` when Next.js tried to statically analyze API routes.

## Root Cause

Next.js 14 attempts to **statically generate** routes during build time when possible. When it encounters API routes, it tries to analyze them to determine if they can be pre-rendered.

The issue:
1. API routes import Supabase client at module level
2. Supabase client requires `NEXT_PUBLIC_SUPABASE_URL` environment variable
3. During Docker build, environment variables are **not available**
4. Supabase instantiation fails → Build fails

## Solution

Added `export const dynamic = 'force-dynamic';` to all API routes that use environment variables.

This tells Next.js: **"Don't try to statically generate this route - it must be rendered at runtime."**

### Files Modified

1. ✅ `app/api/auth/google/route.ts`
2. ✅ `app/api/auth/google/callback/route.ts`
3. ✅ `app/api/auth/google/disconnect/route.ts`
4. ✅ `app/api/connections/status/route.ts`
5. ✅ `app/api/chat/route.ts`

Each file now includes:

```typescript
// Force dynamic rendering
export const dynamic = 'force-dynamic';
```

## Why This Works

- **Before**: Next.js tried to execute API routes during build → needed env vars → failed
- **After**: Next.js skips static analysis → routes only execute at runtime → env vars available → success

## Alternative Solutions (Not Used)

### Option 1: Pass Env Vars During Build (❌ Not Recommended)

```dockerfile
# Bad: Hardcodes secrets in image
RUN NEXT_PUBLIC_SUPABASE_URL=... npm run build
```

**Problems:**
- Secrets baked into Docker image
- Different env vars per deployment
- Security risk

### Option 2: Mock Env Vars (❌ Fragile)

```dockerfile
# Bad: Fake values that could break
RUN NEXT_PUBLIC_SUPABASE_URL=placeholder npm run build
```

**Problems:**
- Could cause subtle bugs
- Validation might fail
- Doesn't solve the root issue

### Option 3: Our Solution (✅ Correct)

```typescript
export const dynamic = 'force-dynamic';
```

**Benefits:**
- ✅ No build-time env vars needed
- ✅ No secrets in Docker image
- ✅ Routes correctly marked as dynamic
- ✅ Proper Next.js pattern for API routes

## Next Steps

1. **Commit changes:**
   ```bash
   git add app/api/
   git commit -m "Fix Next.js build by marking API routes as dynamic"
   git push
   ```

2. **Railway will auto-redeploy**

3. **Build should succeed:**
   ```
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages
   ✓ Finalizing page optimization
   ```

4. **Deployment will succeed:**
   ```
   Starting Container
   ✓ Ready in 358ms
   ```

## Expected Build Output

After this fix, you should see:

```
[ 9/10] RUN npm run build
> next build
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (11/11)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
├ ○ /                                    ...
├ λ /api/auth/google                     0 B      0 B
├ λ /api/auth/google/callback            0 B      0 B
├ λ /api/auth/google/disconnect          0 B      0 B
├ λ /api/chat                            0 B      0 B
├ λ /api/connections/status              0 B      0 B

○  (Static)   prerendered as static content
λ  (Dynamic)  server-rendered on demand
```

Note the `λ` symbol indicating dynamic (server-side) routes.

## Verification

After deployment, test:

1. **App loads**: `https://your-app.up.railway.app`
2. **Login works**: User authentication flows
3. **GA4 connection**: OAuth and MCP connection successful
4. **Chat works**: Send messages with GA4 data

## Additional Notes

### Why API Routes Should Be Dynamic

API routes in Next.js should **always** be dynamic because they:
- Handle authentication (runtime-only)
- Make database queries (runtime-only)
- Process user input (runtime-only)
- Use environment variables (runtime values)

Static generation is only for:
- Marketing pages
- Blog posts
- Documentation
- Content that doesn't change per request

### Railway Environment Variables

Railway automatically injects environment variables at **runtime**, not build time.

This is correct and secure behavior - your API routes now properly access env vars when they execute, not when they build.

---

**Status**: ✅ Ready to deploy!

