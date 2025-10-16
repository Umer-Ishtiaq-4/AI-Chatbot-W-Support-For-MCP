// Connection Status API - Verifies actual backend connection status
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mcpConnectionPool } from '@/lib/mcp/connection-pool';
import { CredentialManager } from '@/lib/mcp/credential-manager';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ConnectionStatus {
  connected: boolean;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
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

    const userId = user.id;

    // Check GA4 connection
    const ga4Status: ConnectionStatus = await checkServiceConnection(
      userId,
      'google-analytics'
    );

    // Check GSC connection
    const gscStatus: ConnectionStatus = await checkServiceConnection(
      userId,
      'google-search-console'
    );

    return NextResponse.json({
      ga4: ga4Status,
      gsc: gscStatus
    });
  } catch (error: any) {
    console.error('Error checking connection status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check connection status' },
      { status: 500 }
    );
  }
}

/**
 * Check if a specific service connection is working
 */
async function checkServiceConnection(
  userId: string,
  serverName: string
): Promise<ConnectionStatus> {
  try {
    // Check if credentials exist
    const credentials = await CredentialManager.getCredentials(userId, serverName);
    
    if (!credentials) {
      return {
        connected: false,
        error: 'No credentials found'
      };
    }

    // Try to get/create connection from pool and verify it works
    const client = await mcpConnectionPool.getConnection(userId, serverName);
    
    // Verify connection by listing tools (lightweight operation)
    await client.listTools();

    return {
      connected: true
    };
  } catch (error: any) {
    console.error(`Connection check failed for ${serverName}:`, error.message);
    
    // Close any failed connection in the pool
    try {
      await mcpConnectionPool.closeConnection(userId, serverName);
    } catch (closeError) {
      console.error('Error closing failed connection:', closeError);
    }

    return {
      connected: false,
      error: error.message || 'Connection verification failed'
    };
  }
}

