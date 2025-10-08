// Google OAuth Callback Route
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleTokens } from '@/lib/auth/google';
import { CredentialManager } from '@/lib/mcp/credential-manager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Redirect to chat page with error
      return NextResponse.redirect(
        new URL(`/chat?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/chat?error=missing_parameters', request.url)
      );
    }

    // Decode state to get user ID and service
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;
    const service = stateData.service || 'all';

    // Exchange code for tokens
    const tokens = await getGoogleTokens(code);

    console.log(`OAuth tokens received for service: ${service}, creating persistent credentials...`);

    // Create credentials based on the service
    const servicesToConnect = service === 'all' 
      ? ['google-analytics', 'google-search-console']
      : service === 'ga4'
      ? ['google-analytics']
      : ['google-search-console'];

    for (const serverName of servicesToConnect) {
      await CredentialManager.createCredentials(userId, serverName, tokens);
      console.log(`Credentials stored successfully for ${serverName}, user:`, userId);
    }

    // Return HTML page that closes popup and notifies parent window
    const serviceType = service === 'ga4' ? 'ga4' : service === 'gsc' ? 'gsc' : 'both';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              text-align: center;
              color: white;
            }
            .success-icon {
              font-size: 64px;
              margin-bottom: 20px;
              animation: scaleIn 0.5s ease-out;
            }
            @keyframes scaleIn {
              from { transform: scale(0); }
              to { transform: scale(1); }
            }
            h1 { margin: 0 0 10px 0; }
            p { opacity: 0.9; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Successfully Connected!</h1>
            <p>This window will close automatically...</p>
          </div>
          <script>
            // Notify parent window
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'oauth_success', 
                service: '${serviceType}'
              }, window.location.origin);
            }
            
            // Close window after a short delay
            setTimeout(() => {
              window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/chat?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
