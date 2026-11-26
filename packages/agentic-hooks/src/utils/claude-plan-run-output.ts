/**
 * Claude Code halves of the four plan-run hooks, one section each. Every
 * section is kept apart from its entrypoint under `../scripts/` so it can be
 * tested without `process.exit`, and each decision lives in the neutral core
 * under `../data/`.
 *
 * - Plan auto-close (PostToolUse, `../scripts/claude-plan-auto-close.ts`):
 *   {@link decideClaudePlanAutoClose}, {@link readUpdateTaskCall}.
 * - Plan-inbox claim (PreToolUse, `../scripts/claude-plan-inbox-claim.ts`):
 *   {@link decideClaudePlanInboxClaim}, {@link findActivePlanRun},
 *   {@link renderInboxOutput}.
 * - Plan narration (PostToolUse and Stop, `../scripts/claude-plan-narration.ts`):
 *   {@link runClaudePlanNarration}, {@link readTaskTitleFromResponse}.
 * - Plan-run invariants (PreToolUse and Stop,
 *   `../scripts/claude-plan-run-invariants.ts`):
 *   {@link decideClaudePlanRunInvariants}, {@link bashCommandsSinceRegister}.
 */
import { isRecord } from '@openthrottle/nodejs-utils';
import {
  claudeSessionToolUsesOf,
  readRunIdentityEnv,
} from '@openthrottle/openthrottle-agentic-utils';

import type {
  InProgressLookupFn,
  PlanInboxClaimFn,
  PlanInboxMessage,
  PlanNarrationAppendFn,
  PlanNarrationChunk,
  PlanRunBinding,
  TaskPlanLookupFn,
} from '../index.ts';
import {
  CLAIM_THROTTLE_WINDOW_MS,
  committedTaskIdsOf,
  decideDoubleInProgress,
  decidePlanAutoClose,
  decideStopNarration,
  decideStrandedAtStop,
  decideTransitionNarration,
  defaultClaimStateDir,
  defaultNarrationStateDir,
  isDestructiveCommand,
  logHookError,
  postPlanNarration,
  readNarratedKeys,
  tryTakeClaimSlot,
} from '../index.ts';
import {
  claudePlanRunTranscript,
  findClaudePlanRunBinding,
  readTranscriptTail,
} from './claude-plan-run-task-guard.ts';

// ── Plan auto-close ──
// Claude Code half of the plan auto-close report (see
// `../scripts/claude-plan-auto-close.ts`, the PostToolUse entrypoint). The
// decision lives in the neutral core (`data/plan-auto-close.ts`); this section
// only knows which Claude tool calls are task updates, where their arguments
// sit, and how the note is rendered.
//
// Payload shape: `tool_input` is the MCP tool's own arguments (`id`,
// `status`).

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

// ── Plan-inbox claim ──
// Claude Code half of the plan-inbox claim hook (see
// `../scripts/claude-plan-inbox-claim.ts`, the PreToolUse entrypoint). Holds
// the tool filter, the active-run detection over transcript lines, the
// throttle wiring and the rendering. The claim call, the destructive-command
// matcher and the throttle live in the neutral core.
//
// The run comes from the transcript (a session that called `register_plan_run`
// itself) and, failing that, from the run identity env an orchestrator exports
// to the CLI it spawns (`OPENTHROTTLE_PLAN_ID` / `_PLAN_RUN_ID` / `_TASK_ID`):
// a headless worker never registers its own run, so its transcript cannot
// name it. The transcript wins when both are present.
//
// Payload shape: `{ session_id, tool_input, tool_name, transcript_path }`.
// A STEER is rendered as a PreToolUse `deny` (the messages are already claimed,
// so the agent must act on the reason text); QUEUE-only is rendered as
// `additionalContext` and lets the call proceed.

const DELEGATION_TOOL_NAMES: ReadonlySet<string> = new Set(['Agent', 'Task']);
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
  const binding = findClaudePlanRunBinding(events);
  if (binding.kind !== 'active' || binding.planId === null) return null;
  return {
    planId: binding.planId,
    planRunId: binding.planRunId,
    taskId: binding.currentTaskId,
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

/**
 * @description The run to claim for: the transcript's registered run, else the
 * run identity the spawning orchestrator exported in `env`, else null.
 */
export const resolveActivePlanRun = (
  events: readonly unknown[],
  env: Readonly<Record<string, string | undefined>>,
): ActivePlanRun | null => {
  return findActivePlanRun(events) ?? readRunIdentityEnv(env);
};

/** Collaborators of the decision, injectable so tests do no I/O of their own. */
export interface PlanInboxClaimDeps {
  readonly claim: PlanInboxClaimFn;
  /** Where the run identity env is read from; defaults to `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>;
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
    const run = resolveActivePlanRun(
      readEvents(candidate.transcriptPath),
      deps.env ?? process.env,
    );
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

// ── Plan narration ──
// Claude Code half of the plan narration hook (see
// `../scripts/claude-plan-narration.ts`, the entrypoint). The decisions live in
// the neutral core (`data/plan-narration.ts`); this section knows the two
// payloads it is registered for, where the task title sits in an `update_task`
// result, and which transcript to read.
//
// - `PostToolUse` on `update_task`: `{ hook_event_name, session_id,
//   tool_input: { id, status }, tool_response, tool_use_id, transcript_path }`.
// - `Stop`: `{ hook_event_name, session_id, transcript_path }`.
//
// It prints nothing either way: narration is a write to the plan's output
// stream, not a message to the model.

const nonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

/** The title of a `{ task: { title } }` object, or null. */
const titleOfTaskResult = (value: unknown): string | null => {
  if (!isRecord(value) || !isRecord(value.task)) return null;
  return nonEmptyString(value.task.title);
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** The MCP content blocks of a tool response: the array itself, or its `content`. */
const contentBlocksOf = (response: unknown): readonly unknown[] => {
  if (Array.isArray(response)) return response;
  if (isRecord(response) && Array.isArray(response.content)) {
    return response.content;
  }
  return [];
};

/**
 * @description The task title in an `update_task` tool response: the result
 * object itself, a JSON string of it, or MCP `content` text blocks holding
 * one. Null for any other shape.
 */
export const readTaskTitleFromResponse = (response: unknown): string | null => {
  if (typeof response === 'string') {
    return titleOfTaskResult(parseJson(response));
  }
  const direct = titleOfTaskResult(response);
  if (direct !== null) return direct;
  for (const block of contentBlocksOf(response)) {
    if (isRecord(block) && typeof block.text === 'string') {
      const title = titleOfTaskResult(parseJson(block.text));
      if (title !== null) return title;
    }
  }
  return null;
};

/** Collaborators of the decision, injectable so tests do no I/O of their own. */
export interface PlanNarrationDeps {
  readonly append: PlanNarrationAppendFn;
  readonly nowMs: () => number;
  readonly readEvents?: (transcriptPath: string) => readonly unknown[];
  readonly stateDir?: string;
}

const chunksFor = (
  raw: Readonly<Record<string, unknown>>,
  events: readonly unknown[],
  deps: PlanNarrationDeps,
  stateDir: string,
  sessionId: string,
): readonly PlanNarrationChunk[] => {
  if (raw.hook_event_name === 'Stop') {
    return decideStopNarration({
      adapter: claudePlanRunTranscript,
      events,
      narratedKeys: readNarratedKeys(stateDir, sessionId),
    });
  }
  const toolName = nonEmptyString(raw.tool_name);
  if (toolName === null || !toolName.endsWith(UPDATE_TASK_SUFFIX)) return [];
  if (!isRecord(raw.tool_input)) return [];
  const chunk = decideTransitionNarration({
    adapter: claudePlanRunTranscript,
    events,
    nowMs: deps.nowMs(),
    status: raw.tool_input.status,
    taskId: nonEmptyString(raw.tool_input.id),
    taskTitle: readTaskTitleFromResponse(raw.tool_response),
    toolUseId: nonEmptyString(raw.tool_use_id),
  });
  return chunk === null ? [] : [chunk];
};

/**
 * @description Decide and post narration for a `PostToolUse` or `Stop`
 * payload. Returns the keys stored. Never throws.
 */
export const runClaudePlanNarration = async (
  raw: unknown,
  deps: PlanNarrationDeps,
): Promise<readonly string[]> => {
  try {
    if (!isRecord(raw)) return [];
    const sessionId = nonEmptyString(raw.session_id);
    const transcriptPath = nonEmptyString(raw.transcript_path);
    if (sessionId === null || transcriptPath === null) return [];

    const readEvents = deps.readEvents ?? readTranscriptTail;
    const stateDir = deps.stateDir ?? defaultNarrationStateDir();
    const events = readEvents(transcriptPath);
    const chunks = chunksFor(raw, events, deps, stateDir, sessionId);
    if (chunks.length === 0) return [];
    return await postPlanNarration({
      append: deps.append,
      chunks,
      sessionId,
      stateDir,
    });
  } catch (err) {
    logHookError('plan-narration: decision failed', err);
    return [];
  }
};

// ── Plan-run invariants ──
// Claude Code half of the plan-run invariant guards (see
// `../scripts/claude-plan-run-invariants.ts`, the entrypoint). The checks live
// in the neutral core (`data/plan-run-invariants.ts`); this section knows the
// two payloads, where Bash commands sit in the transcript, and how a warning
// is rendered.
//
// - `PreToolUse` on `update_task`: a warning is
//   `hookSpecificOutput.additionalContext`, which the model sees while the
//   call proceeds.
// - `Stop`: a warning is a top-level `systemMessage`. A Stop hook cannot add
//   model context without `decision: "block"`, which would force the turn to
//   continue; that is the deny-side escalation and is deliberately not used.
//
// Warn only, never deny, and silent on every infrastructure problem.

/**
 * @description The commands of main-thread Bash calls from the bound run's
 * register onward; none outside a run.
 */
export const bashCommandsSinceRegister = (
  events: readonly unknown[],
  binding: PlanRunBinding,
): readonly string[] => {
  if (binding.kind === 'none') return [];
  return events.slice(binding.registerEventIndex).flatMap((event) => {
    return claudeSessionToolUsesOf(event).flatMap((use): string[] => {
      if (use.name !== 'Bash') return [];
      const command = nonEmptyString(use.input.command);
      return command === null ? [] : [command];
    });
  });
};

/** Collaborators of the decision, injectable so tests do no I/O of their own. */
export interface PlanRunInvariantsDeps {
  readonly lookupInProgress: InProgressLookupFn;
  readonly readEvents?: (transcriptPath: string) => readonly unknown[];
}

const renderPreToolUse = (message: string): string => {
  const hookSpecificOutput = {
    additionalContext: message,
    hookEventName: 'PreToolUse',
  };
  return `${JSON.stringify({ hookSpecificOutput })}\n`;
};

const renderStop = (message: string): string => {
  return `${JSON.stringify({ systemMessage: message })}\n`;
};

/** The stdout for a `PreToolUse` or `Stop` payload, or null to print nothing. */
export const decideClaudePlanRunInvariants = async (
  raw: unknown,
  deps: PlanRunInvariantsDeps,
): Promise<string | null> => {
  try {
    if (!isRecord(raw)) return null;
    const transcriptPath = nonEmptyString(raw.transcript_path);
    if (transcriptPath === null) return null;
    const readEvents = deps.readEvents ?? readTranscriptTail;

    if (raw.hook_event_name === 'Stop') {
      const events = readEvents(transcriptPath);
      const binding = findClaudePlanRunBinding(events);
      const message = decideStrandedAtStop({
        binding,
        committedTaskIds: committedTaskIdsOf(
          bashCommandsSinceRegister(events, binding),
        ),
      });
      return message === null ? null : renderStop(message);
    }

    const toolName = nonEmptyString(raw.tool_name);
    if (toolName === null || !toolName.endsWith(UPDATE_TASK_SUFFIX)) {
      return null;
    }
    if (!isRecord(raw.tool_input)) return null;
    const message = await decideDoubleInProgress({
      binding: findClaudePlanRunBinding(readEvents(transcriptPath)),
      lookupInProgress: deps.lookupInProgress,
      status: raw.tool_input.status,
      taskId: nonEmptyString(raw.tool_input.id),
    });
    return message === null ? null : renderPreToolUse(message);
  } catch (err) {
    logHookError('plan-run-invariants: decision failed', err);
    return null;
  }
};
