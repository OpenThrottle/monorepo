/**
 * @description MCP server and tool constants.
 */

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

/** Default server name when no worktree or override is set. */
export const DEFAULT_SERVER_NAME = '@openthrottle/ai-mcp';

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
