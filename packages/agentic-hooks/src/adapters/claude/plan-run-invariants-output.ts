/**
 * Claude Code half of the plan-run invariant guards (see
 * `./plan-run-invariants.ts`, the entrypoint). The checks live in the neutral
 * core (`data/plan-run-invariants.ts`); this module knows the two payloads,
 * where Bash commands sit in the transcript, and how a warning is rendered.
 * Kept apart from the entrypoint so it can be tested without `process.exit`.
 *
 * - `PreToolUse` on `update_task`: a warning is
 *   `hookSpecificOutput.additionalContext`, which the model sees while the
 *   call proceeds.
 * - `Stop`: a warning is a top-level `systemMessage`. A Stop hook cannot add
 *   model context without `decision: "block"`, which would force the turn to
 *   continue; that is the deny-side escalation and is deliberately not used.
 *
 * Warn only, never deny, and silent on every infrastructure problem.
 */
import { isRecord } from '@openthrottle/nodejs-utils';
import { claudeSessionToolUsesOf } from '@openthrottle/openthrottle-agentic-utils';

import type { InProgressLookupFn, PlanRunBinding } from '../../index.ts';
import {
  committedTaskIdsOf,
  decideDoubleInProgress,
  decideStrandedAtStop,
  logHookError,
} from '../../index.ts';
import { findClaudePlanRunBinding } from './plan-run-binding.ts';
import { readTranscriptTail } from './plan-run-task-guard-output.ts';

const UPDATE_TASK_SUFFIX = '__update_task';

const nonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

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
