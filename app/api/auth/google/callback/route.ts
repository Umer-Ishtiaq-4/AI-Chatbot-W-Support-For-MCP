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

    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    // Exchange code for tokens
    const tokens = await getGoogleTokens(code);

    console.log('OAuth tokens received, creating persistent credentials...');

    // Create persistent credentials file and store in database
    await CredentialManager.createCredentials(
      userId,
      'google-analytics',
      tokens
    );

    console.log('Credentials stored successfully for user:', userId);

    // Redirect to chat with success
    const redirectUrl = new URL('/chat', request.url);
    redirectUrl.searchParams.set('ga4_connected', 'true');

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/chat?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
