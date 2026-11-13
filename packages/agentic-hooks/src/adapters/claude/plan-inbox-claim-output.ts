/**
 * Claude Code half of the plan-inbox claim hook (see `./plan-inbox-claim.ts`,
 * the PreToolUse entrypoint). Holds the tool filter, the active-run detection
 * over transcript lines, the throttle wiring and the rendering. The claim call,
 * the destructive-command matcher and the throttle live in the neutral core.
 *
 * Payload shape: `{ session_id, tool_input, tool_name, transcript_path }`.
 * A STEER is rendered as a PreToolUse `deny` (the messages are already claimed,
 * so the agent must act on the reason text); QUEUE-only is rendered as
 * `additionalContext` and lets the call proceed.
 */
import { isRecord } from '@openthrottle/nodejs-utils';
import {
  claudeSessionToolUsesOf,
  findClaudeSessionPlanRunId,
} from '@openthrottle/openthrottle-agentic-utils';

import {
  CLAIM_THROTTLE_WINDOW_MS,
  defaultClaimStateDir,
  isDestructiveCommand,
  logHookError,
  type PlanInboxClaimFn,
  type PlanInboxMessage,
  tryTakeClaimSlot,
} from '../../index.ts';
import { readTranscriptTail } from './plan-run-task-guard-output.ts';

const DELEGATION_TOOL_NAMES: ReadonlySet<string> = new Set(['Agent', 'Task']);
const REGISTER_RUN_SUFFIX = '__register_plan_run';
const SETTLE_RUN_SUFFIX = '__settle_plan_run';
const UPDATE_TASK_SUFFIX = '__update_task';
const IN_PROGRESS = 'IN_PROGRESS';
const STEER = 'STEER';

/** A plan run the session registered and has not yet settled. */
export interface ActivePlanRun {
  readonly planId: string;
  readonly planRunId: string | null;
  readonly taskId: string | null;
}

/** A tool call the hook decides to act on, with where to find the session. */
interface InboxCandidate {
  readonly sessionId: string;
  readonly transcriptPath: string;
}

/**
 * True for a call worth claiming before: a subagent delegation, or a Bash
 * command matching the destructive list. Pure and I/O free.
 */
export const isInboxClaimTool = (raw: unknown): boolean => {
  if (!isRecord(raw) || typeof raw.tool_name !== 'string') return false;
  if (DELEGATION_TOOL_NAMES.has(raw.tool_name)) return true;
  if (raw.tool_name !== 'Bash' || !isRecord(raw.tool_input)) return false;
  const { command } = raw.tool_input;
  return typeof command === 'string' && isDestructiveCommand(command);
};

const readCandidate = (raw: unknown): InboxCandidate | null => {
  if (!isRecord(raw) || !isInboxClaimTool(raw)) return null;
  const { session_id: sessionId, transcript_path: transcriptPath } = raw;
  if (typeof sessionId !== 'string' || sessionId === '') return null;
  if (typeof transcriptPath !== 'string' || transcriptPath === '') return null;
  return { sessionId, transcriptPath };
};

/**
 * @description The active plan run in the parsed transcript lines: a
 * `register_plan_run` with no later `settle_plan_run`. `planId` is the register
 * input's, `planRunId` comes from the register result, and `taskId` is the
 * `id` of the latest `update_task` setting IN_PROGRESS since the register, or
 * null. Tools are matched by suffix because MCP prefixes vary by host. Null
 * when no run is active or its plan id is unknown.
 */
export const findActivePlanRun = (
  events: readonly unknown[],
): ActivePlanRun | null => {
  let run: { eventIndex: number; planId: unknown } | null = null;
  let taskId: string | null = null;

  for (const [eventIndex, event] of events.entries()) {
    for (const use of claudeSessionToolUsesOf(event)) {
      if (use.name.endsWith(REGISTER_RUN_SUFFIX)) {
        run = { eventIndex, planId: use.input.planId };
        taskId = null;
      } else if (use.name.endsWith(SETTLE_RUN_SUFFIX)) {
        run = null;
        taskId = null;
      } else if (use.name.endsWith(UPDATE_TASK_SUFFIX) && run !== null) {
        const { id, status } = use.input;
        if (typeof id !== 'string' || id === '') continue;
        if (typeof status !== 'string' || status === '') continue;
        if (status.toUpperCase() === IN_PROGRESS) {
          taskId = id;
        } else if (id === taskId) {
          // The in-flight task left IN_PROGRESS (completed, blocked, skipped): none is in flight.
          taskId = null;
        }
      }
    }
  }

  if (run === null || typeof run.planId !== 'string' || run.planId === '') {
    return null;
  }
  return {
    planId: run.planId,
    planRunId: findClaudeSessionPlanRunId(events.slice(run.eventIndex)) ?? null,
    taskId,
  };
};

const formatListing = (messages: readonly PlanInboxMessage[]): string => {
  return messages
    .map((message) => {
      return `[inbox:${message.kind} from @${message.author}] (message ${message.id})\n${message.body}`;
    })
    .join('\n\n');
};

/** The deny reason for a claim that contains a STEER. */
export const formatSteerDenial = (
  messages: readonly PlanInboxMessage[],
  taskId: string | null,
): string => {
  const task = taskId === null ? 'the in-flight task' : `task ${taskId}`;
  return [
    `A STEER arrived in the plan inbox for ${task} before this step:`,
    '',
    formatListing(messages),
    '',
    `Weigh it: pause, redirect, or abort the task to BLOCKED. Acknowledge it via append_plan_output${taskId === null ? '' : ` with taskId ${taskId}`}, then re-issue this call only if it still applies. These messages are already claimed; do not claim them again for this.`,
  ].join('\n');
};

/** The additional context for a QUEUE-only claim. */
export const formatQueueContext = (
  messages: readonly PlanInboxMessage[],
  taskId: string | null,
): string => {
  return [
    'New plan inbox messages were claimed for the upcoming work:',
    '',
    formatListing(messages),
    '',
    `Apply them and acknowledge via append_plan_output${taskId === null ? '' : ` with taskId ${taskId}`}. They are already claimed; do not claim them again.`,
  ].join('\n');
};

/** The PreToolUse stdout for a claimed batch, or null when it is empty. */
export const renderInboxOutput = (
  messages: readonly PlanInboxMessage[],
  taskId: string | null,
): string | null => {
  if (messages.length === 0) return null;
  const hasSteer = messages.some((message) => message.kind === STEER);
  if (hasSteer) {
    const denial = {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: formatSteerDenial(messages, taskId),
    };
    return `${JSON.stringify({ hookSpecificOutput: denial })}\n`;
  }
  const hookSpecificOutput = {
    additionalContext: formatQueueContext(messages, taskId),
    hookEventName: 'PreToolUse',
  };
  return `${JSON.stringify({ hookSpecificOutput })}\n`;
};

/** Collaborators of the decision, injectable so tests do no I/O of their own. */
export interface PlanInboxClaimDeps {
  readonly claim: PlanInboxClaimFn;
  readonly nowMs: () => number;
  readonly readEvents?: (transcriptPath: string) => readonly unknown[];
  readonly stateDir?: string;
  readonly windowMs?: number;
}

/** The PreToolUse stdout for a payload, or null to print nothing. */
export const decideClaudePlanInboxClaim = async (
  raw: unknown,
  deps: PlanInboxClaimDeps,
): Promise<string | null> => {
  try {
    const candidate = readCandidate(raw);
    if (candidate === null) return null;

    const readEvents = deps.readEvents ?? readTranscriptTail;
    const run = findActivePlanRun(readEvents(candidate.transcriptPath));
    if (run === null) return null;

    const hasSlot = tryTakeClaimSlot({
      nowMs: deps.nowMs(),
      sessionId: candidate.sessionId,
      stateDir: deps.stateDir ?? defaultClaimStateDir(),
      windowMs: deps.windowMs ?? CLAIM_THROTTLE_WINDOW_MS,
    });
    if (!hasSlot) return null;

    const messages = await deps.claim({
      planId: run.planId,
      planRunId: run.planRunId,
      taskId: run.taskId,
    });
    return messages === null ? null : renderInboxOutput(messages, run.taskId);
  } catch (err) {
    logHookError('plan-inbox-claim: decision failed', err);
    return null;
  }
};
