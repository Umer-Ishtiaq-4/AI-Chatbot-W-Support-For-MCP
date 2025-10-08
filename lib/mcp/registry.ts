// MCP Server Registry
import { mcpClientManager } from './client';
import { googleAnalyticsMCPClient } from './servers/google-analytics-client';
import { googleSearchConsoleMCPClient } from './servers/google-search-console-client';

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

  // Register Google Search Console MCP Server
  await mcpClientManager.registerServer('google-search-console', {
    server: {
      name: 'Google Search Console',
      description: 'Access Search Console data, search analytics, and optimization insights',
      version: '1.0.0',
      enabled: true
    },
    isConnected: false
  }, googleSearchConsoleMCPClient);
}

// Initialize servers on module load
initializeMCPServers().catch(console.error);
