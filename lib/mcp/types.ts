// MCP Server Types and Interfaces

export interface MCPServerConfig {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

export interface MCPServerConnection {
  server: MCPServerConfig;
  isConnected: boolean;
  credentials?: any;
  lastError?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPServerInterface {
  connect(credentials: any): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<MCPTool[]>;
  listResources(): Promise<MCPResource[]>;
  callTool(name: string, args: any): Promise<any>;
  readResource(uri: string): Promise<any>;
}
