/**
 * Claude Code half of the plan-run task guard (see `./plan-run-task-guard.ts`,
 * the PreToolUse entrypoint). Holds the pure decision over parsed transcript
 * lines, the bounded transcript-tail reader, the payload parsing and the
 * rendering. Kept apart from the entrypoint so it can be tested without
 * `process.exit`.
 *
 * Payload shape: `{ tool_name, transcript_path }`. A flag is rendered as
 * `hookSpecificOutput.additionalContext` on PreToolUse, which Claude Code
 * (2.1.x) shows the model without blocking the call.
 */
import fs from 'node:fs';
import os from 'node:os';

import { isRecord } from '@openthrottle/nodejs-utils';
import {
  claudeSessionToolUsesOf,
  findClaudeSessionPlanRunId,
} from '@openthrottle/openthrottle-agentic-utils';

import { logHookError, readNewBytes } from '../../index.ts';

/** Most bytes of the transcript tail read per edit; a run registered before it is not seen. */
export const PLAN_RUN_GUARD_MAX_TAIL_BYTES = 6 * 1024 * 1024;

/** Tools whose use is an edit this guard looks at. */
const EDIT_TOOL_NAMES: ReadonlySet<string> = new Set([
  'Edit',
  'MultiEdit',
  'NotebookEdit',
  'Write',
]);

const REGISTER_RUN_SUFFIX = '__register_plan_run';
const SETTLE_RUN_SUFFIX = '__settle_plan_run';
const UPDATE_TASK_SUFFIX = '__update_task';
const IN_PROGRESS = 'IN_PROGRESS';

/** The outcome of the decision: pass, or flag with the run the edit belongs to. */
export type PlanRunTaskVerdict =
  { readonly kind: 'flag'; readonly runId: string } | { readonly kind: 'pass' };

interface ActiveRun {
  readonly eventIndex: number;
  readonly planId: string | null;
}

/**
 * @description Decide, from the parsed transcript lines before an edit,
 * whether the edit happens in an active plan run (a `register_plan_run` with no
 * later `settle_plan_run`) in which the most recent status-bearing
 * `update_task` since the register did not set IN_PROGRESS, or none exists.
 * Tools are matched by suffix because MCP prefixes vary by host. `update_task`
 * carries no plan id, so the latest status-bearing call after the register
 * stands in for "the current task". The run id comes from the register result
 * and falls back to the register's `planId` input.
 *
 * A flag is a warning, not a gate: after the last task completes and before
 * `settle_plan_run` (the finishing phase) edits are legitimate and are flagged
 * too, which is why the hook never denies.
 */
export const decidePlanRunTask = (
  events: readonly unknown[],
): PlanRunTaskVerdict => {
  let run: ActiveRun | null = null;
  let latestStatus: string | null = null;

  for (const [eventIndex, event] of events.entries()) {
    for (const use of claudeSessionToolUsesOf(event)) {
      if (use.name.endsWith(REGISTER_RUN_SUFFIX)) {
        const { planId } = use.input;
        run = {
          eventIndex,
          planId: typeof planId === 'string' ? planId : null,
        };
        latestStatus = null;
      } else if (use.name.endsWith(SETTLE_RUN_SUFFIX)) {
        run = null;
      } else if (use.name.endsWith(UPDATE_TASK_SUFFIX) && run !== null) {
        const { status } = use.input;
        if (typeof status === 'string' && status !== '') {
          latestStatus = status.toUpperCase();
        }
      }
    }
  }

  if (run === null || latestStatus === IN_PROGRESS) return { kind: 'pass' };

  const runId =
    findClaudeSessionPlanRunId(events.slice(run.eventIndex)) ??
    run.planId ??
    'unknown';
  return { kind: 'flag', runId };
};

/** The message shown to the agent for a flagged edit. */
export const formatPlanRunTaskFlag = (runId: string): string => {
  return `No task is IN_PROGRESS in plan run ${runId}: flip the task you're working on first.`;
};

/** Parse JSONL text into events, dropping lines that are not JSON. */
export const parseTranscriptLines = (
  lines: readonly string[],
): readonly unknown[] => {
  return lines.flatMap((line): unknown[] => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
};

/**
 * The parsed lines of the last `maxBytes` of a transcript. The first line of
 * the window may be cut mid-line; it fails to parse and is dropped. Any I/O
 * problem yields no events.
 */
export const readTranscriptTail = (
  transcriptPath: string,
  maxBytes: number = PLAN_RUN_GUARD_MAX_TAIL_BYTES,
): readonly unknown[] => {
  try {
    const { size } = fs.statSync(transcriptPath);
    const { lines } = readNewBytes({
      filePath: transcriptPath,
      maxBytes: maxBytes + 1024,
      offset: Math.max(0, size - maxBytes),
    });
    return parseTranscriptLines(lines);
  } catch (err) {
    logHookError('plan-run-task-guard: transcript read failed', err);
    return [];
  }
};

/**
 * @description True for a path under a temp directory (the OS temp dir, `/tmp`,
 * `/private/tmp`, `/var/folders`). Scratch files such as a squash message or a
 * PR body drafted in the finishing phase live there, and are not task work.
 */
export const isScratchPath = (
  filePath: string,
  tempDirs: readonly string[] = [
    os.tmpdir(),
    '/private/tmp',
    '/private/var/folders',
    '/tmp',
    '/var/folders',
  ],
): boolean => {
  return tempDirs.some((dir) => {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`;
    return filePath.startsWith(prefix);
  });
};

/** The file an edit-tool input targets, or null when it names none. */
const editTargetOf = (toolInput: unknown): string | null => {
  if (!isRecord(toolInput)) return null;
  const { file_path: filePath, notebook_path: notebookPath } = toolInput;
  if (typeof filePath === 'string') return filePath;
  return typeof notebookPath === 'string' ? notebookPath : null;
};

/**
 * The transcript path of an edit-tool PreToolUse payload, or null for any
 * other — including an edit to a scratch file under a temp directory.
 */
export const readEditTranscriptPath = (raw: unknown): string | null => {
  if (!isRecord(raw) || typeof raw.tool_name !== 'string') return null;
  if (!EDIT_TOOL_NAMES.has(raw.tool_name)) return null;
  const target = editTargetOf(raw.tool_input);
  if (target !== null && isScratchPath(target)) return null;
  const { transcript_path: transcriptPath } = raw;
  const hasPath = typeof transcriptPath === 'string' && transcriptPath !== '';
  return hasPath ? transcriptPath : null;
};

/** The PreToolUse stdout for a payload, or null to print nothing. */
export const decideClaudePlanRunTaskGuard = (
  raw: unknown,
  readEvents: (
    transcriptPath: string,
  ) => readonly unknown[] = readTranscriptTail,
): string | null => {
  const transcriptPath = readEditTranscriptPath(raw);
  if (transcriptPath === null) return null;
  const verdict = decidePlanRunTask(readEvents(transcriptPath));
  if (verdict.kind === 'pass') return null;
  const hookSpecificOutput = {
    additionalContext: formatPlanRunTaskFlag(verdict.runId),
    hookEventName: 'PreToolUse',
  };
  return `${JSON.stringify({ hookSpecificOutput })}\n`;
};
