/**
 * @description MCP server and tool constants.
 */

import type { ToolsetName } from './toolsets.ts';
import {
  disabledToolsets,
  TOOLSET_DESCRIPTIONS,
  TOOLSETS_ENV,
} from './toolsets.ts';

const DEFAULT_SERVER_NAME = '@openthrottle/openthrottle-mcp';
export const SERVER_VERSION = '1.0.0';

/**
 * @description Tool-usage policy advertised to MCP clients via the server's
 * `instructions`. Carries only the guardrails that are NOT discoverable from the
 * tool schemas; deep plan/task workflow detail lives in the `ot-plans` skill.
 */
export const SERVER_INSTRUCTIONS = `OpenThrottle (OT) is the single source of truth for plans and tasks. These tools write to the OpenThrottle GraphQL API; treat them as the only sanctioned way to record planning work.

Hard rules:
- OT only. Never create or update a plan/task as a Markdown file under docs/ or anywhere else. If these tools are unavailable, fail loudly and report the error — do NOT fall back to writing plans as files.
- create_plan / create_plans / create_task / create_tasks record plans and tasks. create_tasks (one plan, many tasks) and create_plans (many plans) are atomic — the whole batch commits or rolls back together — so prefer them over looping single creates. Prefer reorder_plan_tasks to re-sequence; do not delete-and-recreate to reorder.
- update_task takes the task id (UUID), not the title. Move a task through its lifecycle by updating status (e.g. in_progress → completed), not by recreating.
- Record a merged squash commit on the work ledger, not via a dedicated link tool: attach_session_subject (planId, optional taskId) then record_artifact (type 'git_commit', payload {repo, sha}) under an open session — one artifact per task per merged commit, NOT per intermediate work commit. Per-task work commits carry traceability via the Plan-Id: / Task-Id: footers instead.
- Author/assignee fields expect the GitHub username, not a display name.
- Use append_plan_output / get_plan_output for progress narration on a running plan; delete_plan_output removes a single chunk (chunkId) or clears a plan's output (optionally scoped to taskId) when resetting stale output. Use semantic_search / list_sources / get_document to read the knowledge base before searching ad hoc.

When to use which server:
- Plans & tasks → these OpenThrottle tools (here).
- Repo docs under docs/ → the docs MCP server.
- Database schema → databases/README.md.`;

/**
 * @description The instructions a server serving `enabled` advertises: {@link SERVER_INSTRUCTIONS}, plus
 * one line naming the toolsets it is NOT serving and how to turn them on. Without that line a client
 * has no way to learn a disabled tool exists, because a disabled tool is absent from `tools/list`.
 */
export function buildServerInstructions(
  enabled: ReadonlySet<ToolsetName>,
): string {
  const off = disabledToolsets(enabled);
  if (off.length === 0) {
    return SERVER_INSTRUCTIONS;
  }

  const list = off.map((name) => `${name} (${TOOLSET_DESCRIPTIONS[name]})`);

  return `${SERVER_INSTRUCTIONS}\n\nToolsets not loaded: ${list.join('; ')}. Enable with ${TOOLSETS_ENV}=<names|all> in this server's env.`;
}

/**
 * @description MCP server name: from MCP_SERVER_NAME, or @openthrottle/openthrottle-mcp-{WORKTREE_ID}
 * when WORKTREE_ID is set (e.g. by run-openthrottle-mcp.sh), otherwise default. Makes
 * each worktree advertise a distinct identity so Cursor does not conflate instances.
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
