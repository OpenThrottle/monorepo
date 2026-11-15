/**
 * @description Public `./tool-surface` subpath: the stdio MCP surface exactly as a client lists it, plus the
 * toolset names and server identity needed to replay it. Consumed by `@openthrottle/openthrottle-mcp-evals`,
 * whose tool-selection suite and sandbox serve this surface in place of the real server. No bin or other
 * side-effecting module is reachable from here.
 */

/** @public */
export { getServerName, SERVER_VERSION } from './config/index.ts';
/** @public */
export type { ToolsetName } from './config/toolsets.ts';
/** @public */
export { TOOLSET_NAMES } from './config/toolsets.ts';
/** @public */
export type { ToolSurface } from './model-facing-text/surface.ts';
/** @public */
export { listToolSurface } from './model-facing-text/surface.ts';
