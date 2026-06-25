/**
 * @description MCP server and tool constants.
 */

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

/**
 * @description Max input characters passed to an embedding provider. Unified across OpenAI and
 * Ollama paths so truncation is consistent regardless of provider. Roughly one token per ~4 chars,
 * comfortably under the text-embedding-3-small 8192-token context window.
 */
export const EMBEDDING_MAX_INPUT_CHARS = 8191;

const DEFAULT_SERVER_NAME = '@openthrottle/ai-mcp';

export const SERVER_VERSION = '1.0.0';

/**
 * @description MCP server name: from MCP_SERVER_NAME, or @openthrottle/ai-mcp-{WORKTREE_ID} when WORKTREE_ID is set (e.g. by run-ai-mcp.sh), otherwise default. Makes each worktree advertise a distinct identity so Cursor does not conflate instances.
 */
export function getServerName(): string {
  const override = process.env.MCP_SERVER_NAME;
  if (override != null && override !== '') {
    return override;
  }
  const worktreeId = process.env.WORKTREE_ID;
  if (worktreeId != null && worktreeId !== '') {
    return `${DEFAULT_SERVER_NAME}-${worktreeId}`;
  }
  return DEFAULT_SERVER_NAME;
}
