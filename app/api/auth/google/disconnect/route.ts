// Google Service Disconnect Route
import { NextRequest, NextResponse } from 'next/server';
import { CredentialManager } from '@/lib/mcp/credential-manager';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { service, userId } = await request.json();

    if (!service || !userId) {
      return NextResponse.json(
        { error: 'Missing service or userId' },
        { status: 400 }
      );
    }

    // Validate service type
    if (!['ga4', 'gsc', 'all'].includes(service)) {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      );
    }

    // Determine which services to disconnect
    const servicesToDisconnect = service === 'all' 
      ? ['google-analytics', 'google-search-console']
      : service === 'ga4'
      ? ['google-analytics']
      : ['google-search-console'];

    // Delete credentials for each service
    for (const serverName of servicesToDisconnect) {
      try {
        await CredentialManager.deleteCredentials(userId, serverName);
        console.log(`Disconnected ${serverName} for user:`, userId);
      } catch (error: any) {
        console.error(`Error disconnecting ${serverName}:`, error.message);
        // Continue with other services even if one fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully disconnected',
      service
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

