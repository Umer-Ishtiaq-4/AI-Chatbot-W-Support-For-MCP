// Google OAuth Authentication Route
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/auth/google';
import { supabase } from '@/lib/supabase';

// Force dynamic rendering - don't try to build statically
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get service parameter (ga4, gsc, or all)
    const searchParams = request.nextUrl.searchParams;
    const service = searchParams.get('service') as 'ga4' | 'gsc' | 'all' || 'all';

    // Generate state parameter with user ID and service
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      service: service,
      timestamp: Date.now()
    })).toString('base64');

    const authUrl = getGoogleAuthUrl(state, service);

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
