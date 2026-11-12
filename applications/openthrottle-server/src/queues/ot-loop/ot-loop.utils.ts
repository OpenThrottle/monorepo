import type {
  LoopTask,
  LoopTaskStatus,
} from '@openthrottle/openthrottle-agentic-loop';
import {
  LOOP_TASK_STATUS,
  parseRequirements,
} from '@openthrottle/openthrottle-agentic-loop';
import type { TaskFragment } from '@openthrottle/openthrottle-agentic-ralph';
import { isRunnerExecutedHookTask } from '@openthrottle/openthrottle-agentic-ralph';

import {
  OT_LOOP_SESSION_HEADER,
  OT_LOOP_WORKER_BLANKED_ENV_KEYS,
} from './ot-loop.constants.ts';

const LOOP_TASK_STATUS_VALUES: readonly string[] =
  Object.values(LOOP_TASK_STATUS);

const isLoopTaskStatus = (value: string): value is LoopTaskStatus => {
  return LOOP_TASK_STATUS_VALUES.includes(value);
};

const statusOf = (row: TaskFragment): LoopTaskStatus => {
  if (isRunnerExecutedHookTask(row)) {
    return LOOP_TASK_STATUS.SKIPPED;
  }

  return isLoopTaskStatus(row.status) ? row.status : LOOP_TASK_STATUS.SKIPPED;
};

/**
 * @description Maps an OT task row to the loop's task. A status the loop has no case for
 * (CANCELED, PROMOTED, ...) and a runner-executed hook task both map to `SKIPPED`: resolved, never
 * selected, never blocking the close. Hook tasks fire through the lifecycle dispatcher, so the
 * loop must not also run them (the same rule Ralph applies with `isRunnerExecutedHookTask`).
 */
export const toLoopTask = (row: TaskFragment): LoopTask => {
  return {
    category: row.category ?? null,
    createdAt: String(row.createdAt),
    description: row.description ?? '',
    id: row.id,
    requirements: parseRequirements(row.requirementsJson),
    sortOrder: row.sortOrder,
    status: statusOf(row),
    title: row.title,
  };
};

/**
 * @description Per-call GraphQL options carrying the processor's run session in `X-OT-Session-Id`
 * (as Ralph's status writes do), or `undefined` when the run has no session.
 */
export const buildSessionOptions = (
  workSessionId: string | null | undefined,
): { readonly headers: Readonly<Record<string, string>> } | undefined => {
  if (workSessionId === null || workSessionId === undefined) {
    return undefined;
  }

  return workSessionId === ''
    ? undefined
    : { headers: { [OT_LOOP_SESSION_HEADER]: workSessionId } };
};

/** @description Per-attempt timeout in ms from the run's `iterationTimeoutSeconds`, if any. */
export const toTimeoutMs = (
  seconds: number | null | undefined,
): number | undefined => {
  return seconds === null || seconds === undefined ? undefined : seconds * 1000;
};

/**
 * @description The env override that removes the OT credentials from the worker (§ 2): every
 * credential variable set to an empty string, since a driver's child env is merged over
 * `process.env` and cannot delete a key.
 */
export const buildWorkerEnv = (): Record<string, string> => {
  return Object.fromEntries(
    OT_LOOP_WORKER_BLANKED_ENV_KEYS.map((key) => [key, '']),
  );
};

/** @description Plan-output line for a narration message, one per call. */
export const formatNarration = (prefix: string, message: string): string => {
  return `${prefix} ${message.trimEnd()}\n`;
};

/** @description Body of the BLOCKED task a red final validation creates: the command and its tail. */
export const buildFinalValidationDescription = (input: {
  readonly command: string;
  readonly exitCode: number;
  readonly tail: string;
}): string => {
  return [
    `The whole-plan validation failed before the PR was opened.`,
    `Command: ${input.command}`,
    `Exit code: ${input.exitCode}`,
    `Output tail:`,
    input.tail,
  ].join('\n');
};
