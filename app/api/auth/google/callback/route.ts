// Google OAuth Callback Route
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleTokens } from '@/lib/auth/google';
import { supabase } from '@/lib/supabase';

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

    // Store tokens in database (you might want to create a separate table for this)
    // For now, we'll store in localStorage via a redirect with tokens
    const redirectUrl = new URL('/chat', request.url);
    redirectUrl.searchParams.set('ga4_connected', 'true');
    redirectUrl.searchParams.set('tokens', Buffer.from(JSON.stringify(tokens)).toString('base64'));

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/chat?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
