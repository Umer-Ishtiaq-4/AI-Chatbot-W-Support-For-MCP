// MCP Connection Pool - Maintains persistent connections to MCP servers
import { GoogleAnalyticsMCPClient } from './servers/google-analytics-client';
import { CredentialManager } from './credential-manager';

interface ConnectionEntry {
  client: GoogleAnalyticsMCPClient;
  userId: string;
  serverName: string;
  lastUsed: Date;
  isConnected: boolean;
}

export class MCPConnectionPool {
  private static instance: MCPConnectionPool;
  private connections: Map<string, ConnectionEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Singleton pattern
  static getInstance(): MCPConnectionPool {
    if (!MCPConnectionPool.instance) {
      MCPConnectionPool.instance = new MCPConnectionPool();
    }
    return MCPConnectionPool.instance;
  }

  private constructor() {
    // Start cleanup job - runs every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 30 * 60 * 1000);
  }

  /**
   * Get connection key for a user and server
   */
  private getConnectionKey(userId: string, serverName: string): string {
    return `${userId}:${serverName}`;
  }

  /**
   * Get or create a connection for a user
   */
  async getConnection(
    userId: string,
    serverName: string = 'google-analytics'
  ): Promise<GoogleAnalyticsMCPClient> {
    const key = this.getConnectionKey(userId, serverName);
    const existing = this.connections.get(key);

    // Return existing connection if still valid
    if (existing && existing.isConnected) {
      existing.lastUsed = new Date();
      return existing.client;
    }

    // Create new connection
    const credentials = await CredentialManager.getCredentials(userId, serverName);
    if (!credentials) {
      throw new Error(`No credentials found for user ${userId} and server ${serverName}`);
    }

    const client = new GoogleAnalyticsMCPClient();
    
    try {
      // Pass the persistent credentials path
      await client.connect({
        credentials_path: credentials.credentials_path,
        refresh_token: credentials.refresh_token,
        access_token: credentials.access_token
      });

      const entry: ConnectionEntry = {
        client,
        userId,
        serverName,
        lastUsed: new Date(),
        isConnected: true
      };

      this.connections.set(key, entry);
      console.log(`Created new MCP connection for user ${userId}`);
      
      return client;
    } catch (error: any) {
      console.error(`Failed to connect MCP client for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Close a specific connection
   */
  async closeConnection(userId: string, serverName: string = 'google-analytics'): Promise<void> {
    const key = this.getConnectionKey(userId, serverName);
    const entry = this.connections.get(key);

    if (entry) {
      try {
        await entry.client.disconnect();
        console.log(`Closed MCP connection for user ${userId}`);
      } catch (error) {
        console.error(`Error closing connection for user ${userId}:`, error);
      }
      this.connections.delete(key);
    }
  }

  /**
   * Close all connections for a user
   */
  async closeUserConnections(userId: string): Promise<void> {
    const userConnections = Array.from(this.connections.entries())
      .filter(([_, entry]) => entry.userId === userId);

    for (const [key, entry] of userConnections) {
      try {
        await entry.client.disconnect();
      } catch (error) {
        console.error(`Error closing connection ${key}:`, error);
      }
      this.connections.delete(key);
    }

    console.log(`Closed all connections for user ${userId}`);
  }

  /**
   * Clean up idle connections (not used in last 60 minutes)
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const idleThreshold = 60 * 60 * 1000; // 60 minutes

    const toRemove: string[] = [];

    for (const [key, entry] of this.connections.entries()) {
      const idleTime = now.getTime() - entry.lastUsed.getTime();
      
      if (idleTime > idleThreshold) {
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      const entry = this.connections.get(key);
      if (entry) {
        try {
          await entry.client.disconnect();
          console.log(`Cleaned up idle connection: ${key}`);
        } catch (error) {
          console.error(`Error cleaning up connection ${key}:`, error);
        }
        this.connections.delete(key);
      }
    }

    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} idle MCP connections`);
    }
  }

  /**
   * Get connection stats
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    userBreakdown: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      userBreakdown: {} as Record<string, number>
    };

    for (const entry of this.connections.values()) {
      if (entry.isConnected) {
        stats.activeConnections++;
      }

      if (!stats.userBreakdown[entry.userId]) {
        stats.userBreakdown[entry.userId] = 0;
      }
      stats.userBreakdown[entry.userId]++;
    }

    return stats;
  }

  /**
   * Shutdown all connections (called on server shutdown)
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log(`Shutting down MCP connection pool (${this.connections.size} connections)...`);

    const closePromises = Array.from(this.connections.values()).map(entry =>
      entry.client.disconnect().catch(err => 
        console.error(`Error closing connection during shutdown:`, err)
      )
    );

    await Promise.all(closePromises);
    this.connections.clear();
    
    console.log('MCP connection pool shutdown complete');
  }
}

// Export singleton instance
export const mcpConnectionPool = MCPConnectionPool.getInstance();

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await mcpConnectionPool.shutdown();
  });

  process.on('SIGINT', async () => {
    await mcpConnectionPool.shutdown();
  });
}

