/**
 * Claude Code half of the plan narration hook (see `./plan-narration.ts`, the
 * entrypoint). The decisions live in the neutral core
 * (`data/plan-narration.ts`); this module knows the two payloads it is
 * registered for, where the task title sits in an `update_task` result, and
 * which transcript to read. Kept apart from the entrypoint so it can be tested
 * without `process.exit`.
 *
 * - `PostToolUse` on `update_task`: `{ hook_event_name, session_id,
 *   tool_input: { id, status }, tool_response, tool_use_id, transcript_path }`.
 * - `Stop`: `{ hook_event_name, session_id, transcript_path }`.
 *
 * It prints nothing either way: narration is a write to the plan's output
 * stream, not a message to the model.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { PlanNarrationAppendFn, PlanNarrationChunk } from '../../index.ts';
import {
  decideStopNarration,
  decideTransitionNarration,
  defaultNarrationStateDir,
  logHookError,
  postPlanNarration,
  readNarratedKeys,
} from '../../index.ts';
import { claudePlanRunTranscript } from './plan-run-binding.ts';
import { readTranscriptTail } from './plan-run-task-guard-output.ts';

const UPDATE_TASK_SUFFIX = '__update_task';

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
