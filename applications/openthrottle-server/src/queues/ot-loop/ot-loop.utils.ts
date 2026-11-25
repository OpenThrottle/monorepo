import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import { getGraphQLUrl } from '@openthrottle/nodejs-graphql';
import type {
  LoopTask,
  LoopTaskStatusValue,
} from '@openthrottle/openthrottle-agentic-loop';
import {
  isRunnerExecutedHookTask,
  LOOP_TASK_STATUS,
  parseRequirements,
} from '@openthrottle/openthrottle-agentic-loop';

import type { TaskFragment } from '../../__generated__/graphql.ts';
import {
  OT_LOOP_SESSION_HEADER,
  OT_LOOP_WORKER_BLANKED_ENV_KEYS,
} from './ot-loop.constants.ts';
import type { PlanRunWorkerGraphqlConfig } from './ot-loop.types.ts';

const LOOP_TASK_STATUS_VALUES: readonly string[] =
  Object.values(LOOP_TASK_STATUS);

const isLoopTaskStatus = (value: string): value is LoopTaskStatusValue => {
  return LOOP_TASK_STATUS_VALUES.includes(value);
};

const statusOf = (row: TaskFragment): LoopTaskStatusValue => {
  if (isRunnerExecutedHookTask(row)) {
    return LOOP_TASK_STATUS.SKIPPED;
  }

  return isLoopTaskStatus(row.status) ? row.status : LOOP_TASK_STATUS.SKIPPED;
};

/**
 * @description Maps an OT task row to the loop's task. A status the loop has no case for
 * (CANCELED, PROMOTED, ...) and a runner-executed hook task both map to `SKIPPED`: resolved, never
 * selected, never blocking the close. Hook tasks fire through the lifecycle dispatcher, so the
 * loop must not also run them (see `isRunnerExecutedHookTask`).
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
 * or `undefined` when the run has no session.
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
 * @description The worker's explicit env (§ 2): every OT credential variable set to an empty
 * string. The engine's allowlist already keeps the server env out; the blanks win over any
 * passthrough an install configures.
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

/**
 * @description Returns trimmed `process.env[key]` or `undefined` when missing/blank.
 */
const readTrimmedEnv = (key: string): string | undefined => {
  const raw = process.env[key];
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  return trimmed === '' ? undefined : trimmed;
};

/**
 * @description Worker-scoped GraphQL auth + URL overrides for BullMQ plan runs.
 *
 * **Token order:** `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` (production worker identity), then
 * `OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN`, then `OPENTHROTTLE_MCP_AUTH_TOKEN` (local parity with
 * openthrottle-mcp). **URL order:** `OPENTHROTTLE_WORKER_GRAPHQL_URL`, then
 * `OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL`; with neither, `API_URL_INTERNAL` + `/graphql` applies.
 */
export const resolvePlanRunWorkerGraphqlConfigFromEnv =
  (): PlanRunWorkerGraphqlConfig => {
    return {
      graphqlUrl:
        readTrimmedEnv('OPENTHROTTLE_WORKER_GRAPHQL_URL') ??
        readTrimmedEnv('OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL'),
      token:
        readTrimmedEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN') ??
        readTrimmedEnv('OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN') ??
        readTrimmedEnv('OPENTHROTTLE_MCP_AUTH_TOKEN'),
    };
  };

/**
 * @description Builds the {@link ExecuteGraphqlOptionsV2} every worker GraphQL call starts from. Uses
 * the config's `graphqlUrl` when set, else {@link getGraphQLUrl}, which throws when the URL cannot be
 * resolved (for example `API_URL_INTERNAL` is missing).
 */
export const buildPlanRunWorkerGraphqlOptions = (
  config: PlanRunWorkerGraphqlConfig,
): ExecuteGraphqlOptionsV2 => {
  const override = config.graphqlUrl?.trim();
  const url = override != null && override !== '' ? override : getGraphQLUrl();
  const token = config.token?.trim();

  if (token != null && token !== '') {
    return { token, url };
  }

  return { url };
};
