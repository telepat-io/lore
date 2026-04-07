import { startMcpServer } from '../core/mcp.js';

export async function mcpCommand(): Promise<void> {
  // TODO: Start MCP server on stdio transport
  await startMcpServer(process.cwd());
}
