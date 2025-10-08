# Google OAuth Flow Documentation

## Overview

The chatbot uses Google OAuth 2.0 to authenticate users and obtain permissions to access their Google Analytics data. This document details the complete OAuth flow from initiation to credential storage.

## OAuth Configuration

### Required Scopes

```typescript
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit', // Required for Admin API
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];
```

**Why each scope?**
- `analytics.readonly` - Read GA4 data (reports, metrics)
- `analytics.edit` - Access Admin API (list accounts, properties)
- `userinfo.email` - Get user's email address
- `userinfo.profile` - Get user's basic profile info

### Environment Variables

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_PROJECT_ID=your-google-cloud-project-id
```

## Complete OAuth Flow

### Step 1: Initiation

**User Action**: Clicks "Connect GA4" button

**Frontend Code** (`app/chat/page.tsx`):
```typescript
const connectGA4 = async () => {
  setConnectingGA4(true);
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Request OAuth URL from backend
  const response = await fetch('/api/auth/google', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });
  
  const data = await response.json();
  
  // Open OAuth popup
  window.open(data.authUrl, 'ga4_oauth', 'width=500,height=600,...');
}
```

### Step 2: Generate Auth URL

**API Route**: `/api/auth/google/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // 1. Verify user is authenticated
  const token = request.headers.get('authorization').split(' ')[1];
  const { data: { user } } = await supabase.auth.getUser(token);
  
  // 2. Create state parameter with user ID
  const state = Buffer.from(JSON.stringify({
    userId: user.id,
    timestamp: Date.now()
  })).toString('base64');
  
  // 3. Generate OAuth URL
  const authUrl = googleOAuthClient.generateAuthUrl({
    access_type: 'offline',  // Get refresh token
    scope: GOOGLE_SCOPES,
    state: state,
    prompt: 'consent'         // Force consent to get refresh token
  });
  
  return NextResponse.json({ authUrl });
}
```

**Generated URL Format**:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id={YOUR_CLIENT_ID}
  &redirect_uri=http://localhost:3000/api/auth/google/callback
  &response_type=code
  &scope=https://www.googleapis.com/auth/analytics.readonly%20...
  &access_type=offline
  &state={BASE64_ENCODED_USER_INFO}
  &prompt=consent
```

### Step 3: User Authorization

**Google's OAuth Page**:
1. User logs in to Google account
2. Google shows permission request:
   - "View your Google Analytics data"
   - "Manage Google Analytics account configuration"
   - "See your email address"
3. User clicks "Allow"

### Step 4: Callback with Authorization Code

**Google redirects to**: 
```
http://localhost:3000/api/auth/google/callback?
  code={AUTHORIZATION_CODE}
  &state={BASE64_ENCODED_USER_INFO}
```

**API Route**: `/api/auth/google/callback/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  
  // 1. Decode state to get user ID
  const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  const userId = stateData.userId;
  
  // 2. Exchange authorization code for tokens
  const tokens = await getGoogleTokens(code);
  // tokens = {
  //   access_token: 'ya29.a0...',
  //   refresh_token: '1//0g...',
  //   expiry_date: 1234567890000,
  //   token_type: 'Bearer',
  //   scope: '...'
  // }
  
  // 3. Store credentials persistently
  await CredentialManager.createCredentials(
    userId,
    'google-analytics',
    tokens
  );
  
  // 4. Redirect back to chat with success
  return NextResponse.redirect('/chat?ga4_connected=true');
}
```

### Step 5: Token Exchange

**Function**: `lib/auth/google.ts`

```typescript
export async function getGoogleTokens(code: string) {
  const { tokens } = await googleOAuthClient.getToken(code);
  // Makes POST request to:
  // https://oauth2.googleapis.com/token
  // with: code, client_id, client_secret, redirect_uri, grant_type
  
  return tokens;
}
```

**Token Response**:
```json
{
  "access_token": "ya29.a0AfH6SMBx...",
  "refresh_token": "1//0gzQwPkxFLq...",
  "expiry_date": 1609459200000,
  "token_type": "Bearer",
  "scope": "https://www.googleapis.com/auth/analytics.readonly ..."
}
```

### Step 6: Credential Storage

**CredentialManager** creates:

1. **Credentials File**: `mcp-credentials/{userId}-google-analytics.json`
   ```json
   {
     "type": "authorized_user",
     "client_id": "your_client_id",
     "client_secret": "your_client_secret",
     "refresh_token": "1//0gzQwPkxFLq..."
   }
   ```

2. **Database Record**: `mcp_connections` table
   ```sql
   INSERT INTO mcp_connections (
     user_id,
     server_name,
     credentials_path,
     access_token,
     refresh_token,
     token_expiry,
     is_active
   ) VALUES (
     'abc123...',
     'google-analytics',
     '/path/to/credentials.json',
     'ya29.a0AfH6SMBx...',
     '1//0gzQwPkxFLq...',
     '2024-01-01 12:00:00',
     true
   );
   ```

### Step 7: Success Notification

**Frontend** (`app/chat/page.tsx`):

```typescript
useEffect(() => {
  const ga4Status = searchParams.get('ga4_connected');
  
  if (ga4Status === 'true') {
    setGa4Connected(true);
    localStorage.setItem('ga4_connected', 'true');
    
    // Add success message to chat
    const successMessage = {
      id: `ga4-connected-${Date.now()}`,
      role: 'assistant',
      content: '✅ Successfully connected to Google Analytics 4!',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, successMessage]);
    
    router.replace('/chat'); // Clean URL
  }
}, [searchParams]);
```

## Token Refresh Flow

### When to Refresh

Access tokens expire after **1 hour**. The refresh token is used to get a new access token.

### Automatic Refresh (Future Enhancement)

```typescript
export async function refreshGoogleToken(refreshToken: string) {
  googleOAuthClient.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await googleOAuthClient.refreshAccessToken();
  
  // Update credentials
  await CredentialManager.updateCredentials(userId, 'google-analytics', {
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date
  });
  
  return credentials;
}
```

## Security Considerations

### State Parameter
- **Purpose**: Prevent CSRF attacks
- **Contents**: User ID + timestamp (base64 encoded)
- **Validation**: Server verifies state matches expected user

### Token Storage
- **Access Token**: Short-lived (1 hour), stored in DB
- **Refresh Token**: Long-lived, stored in:
  - Database (encrypted at rest by Supabase)
  - Credentials file (restricted permissions `0o600`)
- **Never** sent to client-side JavaScript

### Redirect URI Validation
- Must match exactly what's configured in Google Console
- Google validates on every OAuth request
- Prevents token theft via redirect hijacking

### Popup vs Redirect
- Uses popup to avoid losing chat state
- Parent window doesn't reload
- Better UX for integration flow

## Error Handling

### User Denies Permission

**URL**: `/chat?error=access_denied`

```typescript
if (error === 'access_denied') {
  alert('You need to grant permissions to use GA4 features');
}
```

### Invalid State

```typescript
if (!state || !code) {
  return redirect('/chat?error=missing_parameters');
}
```

### Token Exchange Failure

```typescript
try {
  const tokens = await getGoogleTokens(code);
} catch (error) {
  console.error('Token exchange failed:', error);
  return redirect('/chat?error=token_exchange_failed');
}
```

### Credential Storage Failure

```typescript
try {
  await CredentialManager.createCredentials(...);
} catch (error) {
  // File cleanup handled by CredentialManager
  return redirect('/chat?error=storage_failed');
}
```

## Testing the OAuth Flow

### Manual Test

1. Start dev server: `npm run dev`
2. Login to chat app
3. Click "Connect GA4"
4. Should open Google OAuth popup
5. Sign in and grant permissions
6. Should redirect back with success message
7. Check logs for:
   ```
   OAuth tokens received, creating persistent credentials...
   Credentials stored successfully for user: {userId}
   ```

### Verify Credentials

**Database**:
```sql
SELECT * FROM mcp_connections WHERE user_id = '{userId}';
```

**File System**:
```bash
ls -la mcp-credentials/
# Should show: {userId}-google-analytics.json with 600 permissions
```

### Test Connection

```typescript
// In chat, send message: "Show me my GA4 accounts"
// Should see logs:
// - "Starting GA4 MCP server with persistent credentials: ..."
// - "Successfully connected to GA4 MCP server"
// - "Dynamically loaded GA4 tools: [...]"
```

## Troubleshooting

### "redirect_uri_mismatch"
**Fix**: Add exact URI to Google Console authorized redirect URIs

### "invalid_client"
**Fix**: Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### "access_denied"
**Fix**: User needs to grant all requested permissions

### No refresh_token
**Fix**: Add `prompt: 'consent'` to force consent screen
**Fix**: Revoke app access in Google account and reconnect

### Token expired
**Fix**: Implement automatic token refresh (future enhancement)

## Google Cloud Console Setup

### Create OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project
3. APIs & Services > Credentials
4. Create Credentials > OAuth client ID
5. Application type: **Web application**
6. Name: "Next.js Chatbot GA4 Integration"
7. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
8. Copy Client ID and Client Secret to `.env.local`

### Enable Required APIs

1. APIs & Services > Library
2. Enable:
   - Google Analytics Data API
   - Google Analytics Admin API

## Related Documentation

- [MCP Connection Management](./MCP-CONNECTION-MANAGEMENT.md)
- [Database Schema](./DATABASE-SCHEMA.md)
- [Security Best Practices](./SECURITY.md)

