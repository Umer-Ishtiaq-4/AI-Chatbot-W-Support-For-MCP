// MCP Server Registry
import { mcpClientManager } from './client';
import { googleAnalyticsMCPClient } from './servers/google-analytics-client';

// Register all available MCP servers
export async function initializeMCPServers() {
  // Register Google Analytics MCP Server (connects to official Python server)
  await mcpClientManager.registerServer('google-analytics', {
    server: {
      name: 'Google Analytics 4',
      description: 'Query and analyze Google Analytics 4 data via official MCP server',
      version: '1.0.0',
      enabled: true
    },
    isConnected: false
  }, googleAnalyticsMCPClient);
}

// Initialize servers on module load
initializeMCPServers().catch(console.error);
