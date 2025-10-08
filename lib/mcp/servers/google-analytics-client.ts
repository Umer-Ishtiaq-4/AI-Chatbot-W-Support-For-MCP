// Google Analytics MCP Client - Connects to the official Python MCP server
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPServerInterface, MCPTool, MCPResource } from '../types';

export class GoogleAnalyticsMCPClient implements MCPServerInterface {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected: boolean = false;
  private cachedTools: MCPTool[] = [];

  async connect(credentials: any): Promise<void> {
    if (this.isConnected && this.client) {
      return; // Already connected
    }

    try {
      const fs = require('fs');
      const os = require('os');
      const path = require('path');

      // Create a temporary credentials file for the Python server
      const tempDir = os.tmpdir();
      const credentialsPath = path.join(tempDir, `ga4-mcp-creds-${Date.now()}.json`);

      // Write OAuth credentials in the format Google expects
      const credentialsData = {
        type: 'authorized_user',
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: credentials.refresh_token
      };

      fs.writeFileSync(credentialsPath, JSON.stringify(credentialsData, null, 2));

      // Create environment with Google credentials
      const env = {
        GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
        GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || '',
        ...process.env
      };

      console.log('Starting GA4 MCP server with credentials at:', credentialsPath);

      // Connect to the Python MCP server via stdio
      this.transport = new StdioClientTransport({
        command: 'pipx',
        args: ['run', 'analytics-mcp'],
        env
      });

      this.client = new Client({
        name: 'ga4-chat-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await this.client.connect(this.transport);
      this.isConnected = true;

      console.log('Successfully connected to GA4 MCP server');

      // Fetch and cache tools immediately after connection
      await this.refreshTools();

      // Clean up temp file after a delay (it needs to exist while server is running)
      // Don't delete immediately - server needs it
    } catch (error: any) {
      this.isConnected = false;
      console.error('Failed to connect to GA MCP server:', error);
      throw new Error(`Failed to connect to Google Analytics MCP server: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.transport = null;
    this.isConnected = false;
    this.cachedTools = [];
  }

  private async refreshTools(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const result = await this.client.listTools();
    this.cachedTools = result.tools as MCPTool[];
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Google Analytics MCP server');
    }

    // Return cached tools if available, otherwise refresh
    if (this.cachedTools.length === 0) {
      await this.refreshTools();
    }

    return this.cachedTools;
  }

  async listResources(): Promise<MCPResource[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Google Analytics MCP server');
    }

    const result = await this.client.listResources();
    return result.resources as MCPResource[];
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Google Analytics MCP server');
    }

    const result = await this.client.callTool({
      name,
      arguments: args
    });

    return result;
  }

  async readResource(uri: string): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Google Analytics MCP server');
    }

    const result = await this.client.readResource({ uri });
    return result;
  }
}

export const googleAnalyticsMCPClient = new GoogleAnalyticsMCPClient();

