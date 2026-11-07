/**
 * Claude Code half of the plan auto-close report (see `./plan-auto-close.ts`,
 * the PostToolUse entrypoint). The decision lives in the neutral core
 * (`data/plan-auto-close.ts`); this module only knows which Claude tool calls
 * are task updates, where their arguments sit, and how the note is rendered.
 * Kept apart from the entrypoint so it can be tested without `process.exit`.
 *
 * Payload shape: `tool_input` is the MCP tool's own arguments (`id`,
 * `status`).
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import { decidePlanAutoClose, type TaskPlanLookupFn } from '../../index.ts';

/** Tool-name suffix this hook applies to; MCP prefixes vary by host. */
const UPDATE_TASK_SUFFIX = '__update_task';

/** The task id and status argument of an `update_task` payload, or null. */
export const readUpdateTaskCall = (
  raw: unknown,
): { readonly status: unknown; readonly taskId: string | null } | null => {
  if (!isRecord(raw) || typeof raw.tool_name !== 'string') return null;
  if (!raw.tool_name.endsWith(UPDATE_TASK_SUFFIX)) return null;
  if (!isRecord(raw.tool_input)) return null;
  const { id, status } = raw.tool_input;
  const taskId = typeof id === 'string' && id.trim() !== '' ? id : null;
  return { status, taskId };
};

/** The PostToolUse stdout for a payload, or null to print nothing. */
export const decideClaudePlanAutoClose = async (
  raw: unknown,
  lookup: TaskPlanLookupFn,
): Promise<string | null> => {
  const call = readUpdateTaskCall(raw);
  if (call === null) return null;
  const message = await decidePlanAutoClose({ lookup, ...call });
  if (message === null) return null;
  const hookSpecificOutput = {
    additionalContext: message,
    hookEventName: 'PostToolUse',
  };
  return `${JSON.stringify({ hookSpecificOutput })}\n`;
};
