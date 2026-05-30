/**
 * @description Re-exports foreign-workspace helpers from `@openthrottle/ai-mcp` (shared with orchestrator).
 */
export {
  buildForeignWorkspacePromptLayer,
  resolveForeignWorkspaceContext,
  resolveForeignWorkspacePromptLayer,
} from '@openthrottle/ai-mcp/src/foreign-workspace-context';

export type { ForeignWorkspaceContext } from '@openthrottle/ai-mcp/src/foreign-workspace-context';
