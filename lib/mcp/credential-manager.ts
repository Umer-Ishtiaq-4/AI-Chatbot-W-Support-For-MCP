// MCP Credential Manager - Handles persistent credential storage
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface MCPCredentials {
  id: string;
  user_id: string;
  server_name: string;
  credentials_path: string;
  access_token?: string;
  refresh_token: string;
  token_expiry?: Date;
  is_active: boolean;
}

export class CredentialManager {
  private static credentialsDir = path.join(process.cwd(), 'mcp-credentials');

  static {
    // Ensure credentials directory exists on startup
    if (!fs.existsSync(this.credentialsDir)) {
      fs.mkdirSync(this.credentialsDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Create and store credentials for a user's MCP server connection
   */
  static async createCredentials(
    userId: string,
    serverName: string,
    tokens: { access_token?: string; refresh_token: string; expiry_date?: number }
  ): Promise<MCPCredentials> {
    // Use service role key to bypass RLS (server-side operation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create credentials file
    const credentialsPath = path.join(
      this.credentialsDir,
      `${userId}-${serverName}.json`
    );

    const credentialsData = {
      type: 'authorized_user',
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      ...(tokens.access_token && { access_token: tokens.access_token })
    };

    // Write credentials file with restricted permissions
    fs.writeFileSync(credentialsPath, JSON.stringify(credentialsData, null, 2), {
      mode: 0o600 // Only owner can read/write
    });

    // Store in database
    const { data, error } = await supabase
      .from('mcp_connections')
      .upsert({
        user_id: userId,
        server_name: serverName,
        credentials_path: credentialsPath,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        is_active: true,
        updated_at: new Date()
      }, {
        onConflict: 'user_id,server_name'
      })
      .select()
      .single();

    if (error) {
      // Clean up file if DB insert failed
      fs.unlinkSync(credentialsPath);
      throw new Error(`Failed to store credentials: ${error.message}`);
    }

    return data as MCPCredentials;
  }

  /**
   * Get credentials for a user's MCP server connection
   */
  static async getCredentials(
    userId: string,
    serverName: string
  ): Promise<MCPCredentials | null> {
    // Use service role key to bypass RLS (server-side operation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabase
      .from('mcp_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('server_name', serverName)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    // Verify file still exists
    if (!fs.existsSync(data.credentials_path)) {
      // File missing, mark as inactive
      await this.deactivateCredentials(userId, serverName);
      return null;
    }

    return data as MCPCredentials;
  }

  /**
   * Update credentials (e.g., after token refresh)
   */
  static async updateCredentials(
    userId: string,
    serverName: string,
    tokens: { access_token?: string; refresh_token?: string; expiry_date?: number }
  ): Promise<void> {
    // Use service role key to bypass RLS (server-side operation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const credentials = await this.getCredentials(userId, serverName);
    if (!credentials) {
      throw new Error('Credentials not found');
    }

    // Update the credentials file
    const currentData = JSON.parse(fs.readFileSync(credentials.credentials_path, 'utf-8'));
    const updatedData = {
      ...currentData,
      ...(tokens.access_token && { access_token: tokens.access_token }),
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token })
    };

    fs.writeFileSync(credentials.credentials_path, JSON.stringify(updatedData, null, 2), {
      mode: 0o600
    });

    // Update database
    const updateData: any = {
      updated_at: new Date()
    };
    if (tokens.access_token) updateData.access_token = tokens.access_token;
    if (tokens.refresh_token) updateData.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) updateData.token_expiry = new Date(tokens.expiry_date);

    const { error } = await supabase
      .from('mcp_connections')
      .update(updateData)
      .eq('user_id', userId)
      .eq('server_name', serverName);

    if (error) {
      throw new Error(`Failed to update credentials: ${error.message}`);
    }
  }

  /**
   * Deactivate credentials (soft delete)
   */
  static async deactivateCredentials(userId: string, serverName: string): Promise<void> {
    // Use service role key to bypass RLS (server-side operation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error } = await supabase
      .from('mcp_connections')
      .update({ is_active: false, updated_at: new Date() })
      .eq('user_id', userId)
      .eq('server_name', serverName);

    if (error) {
      throw new Error(`Failed to deactivate credentials: ${error.message}`);
    }
  }

  /**
   * Delete credentials completely
   */
  static async deleteCredentials(userId: string, serverName: string): Promise<void> {
    // Use service role key to bypass RLS (server-side operation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const credentials = await this.getCredentials(userId, serverName);
    if (!credentials) {
      return; // Already deleted
    }

    // Delete file
    if (fs.existsSync(credentials.credentials_path)) {
      fs.unlinkSync(credentials.credentials_path);
    }

    // Delete from database
    const { error } = await supabase
      .from('mcp_connections')
      .delete()
      .eq('user_id', userId)
      .eq('server_name', serverName);

    if (error) {
      throw new Error(`Failed to delete credentials: ${error.message}`);
    }
  }

  /**
   * Clean up inactive credentials older than specified days
   */
  static async cleanupOldCredentials(daysOld: number = 30): Promise<void> {
    // Use service role key to bypass RLS (server-side operation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data: oldCredentials, error } = await supabase
      .from('mcp_connections')
      .select('*')
      .eq('is_active', false)
      .lt('updated_at', cutoffDate.toISOString());

    if (error) {
      console.error('Failed to fetch old credentials:', error);
      return;
    }

    if (oldCredentials) {
      for (const cred of oldCredentials) {
        // Delete file
        if (fs.existsSync(cred.credentials_path)) {
          fs.unlinkSync(cred.credentials_path);
        }

        // Delete from database
        await supabase
          .from('mcp_connections')
          .delete()
          .eq('id', cred.id);
      }
    }
  }
}

