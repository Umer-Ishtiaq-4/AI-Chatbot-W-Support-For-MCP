// Google Service Disconnect Route
import { NextRequest, NextResponse } from 'next/server';
import { CredentialManager } from '@/lib/mcp/credential-manager';
import { mcpConnectionPool } from '@/lib/mcp/connection-pool';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { service } = await request.json();

    if (!service) {
      return NextResponse.json(
        { error: 'Missing service parameter' },
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

    // Verify user authentication from session token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = user.id; // Get userId from authenticated session

    // Determine which services to disconnect
    const servicesToDisconnect = service === 'all' 
      ? ['google-analytics', 'google-search-console']
      : service === 'ga4'
      ? ['google-analytics']
      : ['google-search-console'];

    // Delete credentials and close active connections for each service
    for (const serverName of servicesToDisconnect) {
      try {
        // Close active connection in pool first
        await mcpConnectionPool.closeConnection(userId, serverName);
        console.log(`Closed active connection for ${serverName}, user:`, userId);
        
        // Then delete credentials
        await CredentialManager.deleteCredentials(userId, serverName);
        console.log(`Deleted credentials for ${serverName}, user:`, userId);
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

