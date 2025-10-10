// MCP Client Manager
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPServerConnection, MCPServerInterface, MCPTool, MCPResource } from './types';

export class MCPClientManager {
  private servers: Map<string, MCPServerConnection> = new Map();
  private clients: Map<string, Client> = new Map();

  async registerServer(
    serverId: string,
    serverConfig: MCPServerConnection,
    serverImplementation: MCPServerInterface
  ): Promise<void> {
    this.servers.set(serverId, serverConfig);
  }

  async connectServer(serverId: string, credentials: any): Promise<void> {
    const serverConnection = this.servers.get(serverId);
    if (!serverConnection) {
      throw new Error(`Server ${serverId} not registered`);
    }

    try {
      // Update connection status
      serverConnection.credentials = credentials;
      serverConnection.isConnected = true;
      serverConnection.lastError = undefined;
      this.servers.set(serverId, serverConnection);
    } catch (error: any) {
      serverConnection.isConnected = false;
      serverConnection.lastError = error.message;
      this.servers.set(serverId, serverConnection);
      throw error;
    }
  }

  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.close();
      this.clients.delete(serverId);
    }

    const serverConnection = this.servers.get(serverId);
    if (serverConnection) {
      serverConnection.isConnected = false;
      serverConnection.credentials = undefined;
      this.servers.set(serverId, serverConnection);
    }
  }

  getServerConnection(serverId: string): MCPServerConnection | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): Map<string, MCPServerConnection> {
    return this.servers;
  }

  isServerConnected(serverId: string): boolean {
    const server = this.servers.get(serverId);
    return server?.isConnected || false;
  }

  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not connected`);
    }

    const result = await client.callTool({ name: toolName, arguments: args });
    return result;
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not connected`);
    }

    const result = await client.listTools();
    return result.tools as MCPTool[];
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not connected`);
    }

    const result = await client.listResources();
    return result.resources as MCPResource[];
  }
}

// Singleton instance
export const mcpClientManager = new MCPClientManager();
