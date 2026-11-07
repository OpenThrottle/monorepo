/**
 * Agent trajectory delivery: POST one task's trajectory to
 * `recordAgentTrajectory`, buffer it when the server cannot take it right now,
 * dead-letter it when the server rejects the payload itself, and drain the
 * buffer later. Same failure classification and buffer mechanics as the other
 * telemetry streams (see `graphql.ts` and `jsonl.ts`). Nothing here throws.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import { resolveAuthToken, resolveGraphqlUrl } from '../config/env.ts';
import type {
  DrainFileResult,
  HookFetch,
  PostFailure,
  PostResult,
} from '../types.ts';
import { logHookError } from '../utils/logging.ts';
import { postGraphqlField, postGraphqlMutation } from './graphql.ts';
import {
  appendDeadLetters,
  appendJsonl,
  defaultTrajectoriesJsonlPath,
  drainJsonlFile,
} from './jsonl.ts';

/**
 * A trajectory is up to 640 KiB on the wire, so it gets longer than the
 * small-payload default before a slow server counts as a transient failure.
 *
 * @public
 */
export const DEFAULT_TRAJECTORY_POST_TIMEOUT_MS = 3000;

const RECORD_AGENT_TRAJECTORY_MUTATION = `
mutation RecordAgentTrajectoryFromHook($input: RecordAgentTrajectoryInput!) {
  recordAgentTrajectory(input: $input) {
    id
  }
}
`;

const REPLACE_AGENT_TRAJECTORY_MUTATION = `
mutation ReplaceAgentTrajectoryFromHook(
  $id: ID!
  $input: ReplaceAgentTrajectoryInput!
) {
  replaceAgentTrajectory(id: $id, input: $input) {
    id
  }
}
`;

const TRAJECTORIES_BY_PLAN_RUN_QUERY = `
query AgentTrajectoriesByPlanRunFromHook($planRunId: ID!) {
  agentTrajectoriesByPlanRun(planRunId: $planRunId) {
    id
    idempotencyKey
    source
    taskId
    trajectoryJson
  }
}
`;

const TRAJECTORIES_BY_TASK_QUERY = `
query AgentTrajectoriesByTaskFromHook($taskId: ID!) {
  agentTrajectoriesByTask(taskId: $taskId) {
    id
    idempotencyKey
    source
    taskId
    trajectoryJson
  }
}
`;

/**
 * One trajectory, shaped like the `RecordAgentTrajectoryInput` it is sent as
 * (and as it is buffered, so a drained line needs no mapping).
 *
 * @public
 */
export interface TrajectoryInput {
  readonly driver: string;
  readonly durationMs: number | null;
  readonly exitCode: number | null;
  /**
   * Makes recording idempotent server-side (a duplicate returns the stored row), so a buffered
   * retry plus a dead-letter replay cannot insert a segment twice. It travels with the payload
   * through the buffer and dead-letter files.
   */
  readonly idempotencyKey: string | null;
  readonly model: string | null;
  readonly outcome: string | null;
  readonly planRunId: string;
  readonly source: string;
  readonly taskId: string | null;
  readonly trajectoryJson: string;
}

/**
 * Where a trajectory ended up. `dropped` means neither the server, the buffer
 * nor the dead-letter file would take it (an I/O failure), so the caller should
 * try again later rather than treat it as accounted for.
 *
 * @public
 */
export type PersistTrajectoryResult =
  | { readonly id: string; readonly sink: 'server' }
  | { readonly reason: string; readonly sink: 'buffered' }
  | { readonly reason: string; readonly sink: 'dead-letter' }
  | { readonly reason: string; readonly sink: 'dropped' };

const resolveTrajectoryTimeout = (timeoutMs?: number): number => {
  return (
    timeoutMs ??
    (Number(process.env.OPENTHROTTLE_TELEMETRY_TIMEOUT_MS) ||
      DEFAULT_TRAJECTORY_POST_TIMEOUT_MS)
  );
};

/**
 * One already-stored trajectory, as the re-segment operator needs it: id for
 * in-place replace, task/idempotency keys for matching, and the document for
 * old step counts.
 *
 * @public
 */
export interface StoredTrajectoryRow {
  readonly id: string;
  readonly idempotencyKey: string | null;
  readonly source: string;
  readonly stepCount: number;
  readonly taskId: string | null;
  readonly trajectoryJson: string;
}

const stepCountOf = (trajectoryJson: string): number => {
  try {
    const parsed: unknown = JSON.parse(trajectoryJson);
    if (!isRecord(parsed) || !Array.isArray(parsed.steps)) {
      return 0;
    }
    return parsed.steps.length;
  } catch {
    return 0;
  }
};

const readStoredRow = (value: unknown): StoredTrajectoryRow | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id === '') {
    return undefined;
  }
  const trajectoryJson =
    typeof value.trajectoryJson === 'string' ? value.trajectoryJson : '{}';
  return {
    id: value.id,
    idempotencyKey:
      typeof value.idempotencyKey === 'string' ? value.idempotencyKey : null,
    source: typeof value.source === 'string' ? value.source : '',
    stepCount: stepCountOf(trajectoryJson),
    taskId: typeof value.taskId === 'string' ? value.taskId : null,
    trajectoryJson,
  };
};

/**
 * POST one trajectory to recordAgentTrajectory. Fail-open result object.
 *
 * @public
 */
export const postTrajectory = async ({
  authToken = '',
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  input,
  timeoutMs = DEFAULT_TRAJECTORY_POST_TIMEOUT_MS,
}: {
  authToken?: string;
  fetchImpl?: HookFetch;
  graphqlUrl: string | null;
  input: TrajectoryInput;
  timeoutMs?: number;
}): Promise<PostResult> => {
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: 'recordAgentTrajectory',
    graphqlUrl,
    query: RECORD_AGENT_TRAJECTORY_MUTATION,
    timeoutMs,
    variables: { input },
  });
};

/**
 * Replace the document on an existing trajectory, keeping its id. Fail-open.
 *
 * @public
 */
export const replaceTrajectory = async ({
  authToken = '',
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  id,
  input,
  timeoutMs = DEFAULT_TRAJECTORY_POST_TIMEOUT_MS,
}: {
  authToken?: string;
  fetchImpl?: HookFetch;
  graphqlUrl: string | null;
  id: string;
  input: Pick<
    TrajectoryInput,
    | 'durationMs'
    | 'exitCode'
    | 'idempotencyKey'
    | 'model'
    | 'outcome'
    | 'planRunId'
    | 'trajectoryJson'
  >;
  timeoutMs?: number;
}): Promise<PostResult> => {
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: 'replaceAgentTrajectory',
    graphqlUrl,
    query: REPLACE_AGENT_TRAJECTORY_MUTATION,
    timeoutMs,
    variables: {
      id,
      input: {
        durationMs: input.durationMs,
        exitCode: input.exitCode,
        idempotencyKey: input.idempotencyKey,
        model: input.model,
        outcome: input.outcome,
        planRunId: input.planRunId,
        trajectoryJson: input.trajectoryJson,
      },
    },
  });
};

const readTrajectoryList = (
  posted: PostFailure | { data: unknown; ok: true },
  field: string,
): PostFailure | { ok: true; rows: readonly StoredTrajectoryRow[] } => {
  if (!posted.ok) {
    return posted;
  }
  if (!Array.isArray(posted.data)) {
    return { ok: false, permanent: false, reason: `missing ${field}` };
  }
  return {
    ok: true,
    rows: posted.data.flatMap((entry) => {
      const row = readStoredRow(entry);
      return row === undefined ? [] : [row];
    }),
  };
};

/**
 * List a plan run's trajectories for the re-segment matcher. Fail-open: a
 * transport failure returns the failure; a success returns the rows.
 *
 * @public
 */
export const fetchTrajectoriesByPlanRun = async ({
  authToken = '',
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  planRunId,
  timeoutMs = DEFAULT_TRAJECTORY_POST_TIMEOUT_MS,
}: {
  authToken?: string;
  fetchImpl?: HookFetch;
  graphqlUrl: string | null;
  planRunId: string;
  timeoutMs?: number;
}): Promise<
  PostFailure | { ok: true; rows: readonly StoredTrajectoryRow[] }
> => {
  return readTrajectoryList(
    await postGraphqlField({
      authToken,
      fetchImpl,
      field: 'agentTrajectoriesByPlanRun',
      graphqlUrl,
      query: TRAJECTORIES_BY_PLAN_RUN_QUERY,
      timeoutMs,
      variables: { planRunId },
    }),
    'agentTrajectoriesByPlanRun',
  );
};

/**
 * List a task's trajectories for the re-segment matcher (covers a resume that
 * moved the task onto a different plan_run_id than neighbours).
 *
 * @public
 */
export const fetchTrajectoriesByTask = async ({
  authToken = '',
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  taskId,
  timeoutMs = DEFAULT_TRAJECTORY_POST_TIMEOUT_MS,
}: {
  authToken?: string;
  fetchImpl?: HookFetch;
  graphqlUrl: string | null;
  taskId: string;
  timeoutMs?: number;
}): Promise<
  PostFailure | { ok: true; rows: readonly StoredTrajectoryRow[] }
> => {
  return readTrajectoryList(
    await postGraphqlField({
      authToken,
      fetchImpl,
      field: 'agentTrajectoriesByTask',
      graphqlUrl,
      query: TRAJECTORIES_BY_TASK_QUERY,
      timeoutMs,
      variables: { taskId },
    }),
    'agentTrajectoriesByTask',
  );
};

const bufferTrajectory = (
  input: TrajectoryInput,
  jsonlPath: string,
  reason: string,
): PersistTrajectoryResult => {
  try {
    appendJsonl(jsonlPath, input);
    return { reason, sink: 'buffered' };
  } catch (err) {
    logHookError('trajectory jsonl append failed', err);
    return { reason: `buffer failed: ${reason}`, sink: 'dropped' };
  }
};

/**
 * Send one trajectory. A transient failure (network, timeout, 5xx, auth,
 * offline, no endpoint) buffers it to `trajectories.jsonl`; a permanent one (a
 * 4xx such as 413, or a GraphQL rejection) dead-letters it. Never throws.
 *
 * @public
 */
export const persistTrajectory = async (
  input: TrajectoryInput,
  {
    authToken: authTokenOverride,
    fetchImpl,
    graphqlUrl: graphqlUrlOverride,
    jsonlPath,
    repoRoot,
    timeoutMs,
  }: {
    authToken?: string;
    fetchImpl?: HookFetch;
    graphqlUrl?: string | null;
    jsonlPath?: string;
    repoRoot: string;
    timeoutMs?: number;
  },
): Promise<PersistTrajectoryResult> => {
  const outPath = jsonlPath || defaultTrajectoriesJsonlPath();
  try {
    const offline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1';
    const graphqlUrl = offline
      ? null
      : (graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot));
    if (offline || !graphqlUrl) {
      return bufferTrajectory(
        input,
        outPath,
        offline ? 'OPENTHROTTLE_TELEMETRY_OFFLINE=1' : 'missing graphql url',
      );
    }

    const res = await postTrajectory({
      authToken: authTokenOverride ?? resolveAuthToken(repoRoot),
      fetchImpl,
      graphqlUrl,
      input,
      timeoutMs: resolveTrajectoryTimeout(timeoutMs),
    });
    if (res.ok) {
      return { id: res.id, sink: 'server' };
    }

    if (!res.permanent) {
      logHookError(
        `trajectory post failed; falling back to jsonl (${res.reason})`,
      );
      return bufferTrajectory(input, outPath, res.reason);
    }

    logHookError(`trajectory rejected; moved to dead-letter (${res.reason})`);
    try {
      appendDeadLetters({
        filePath: outPath,
        reason: res.reason,
        records: [input],
      });
      return { reason: res.reason, sink: 'dead-letter' };
    } catch (err) {
      logHookError('trajectory dead-letter append failed', err);
      return { reason: `dead-letter failed: ${res.reason}`, sink: 'dropped' };
    }
  } catch (err) {
    logHookError('persistTrajectory failed', err);
    return {
      reason: err instanceof Error ? err.message : String(err),
      sink: 'dropped',
    };
  }
};

const emptyDrain = (): DrainFileResult => {
  return { deadLettered: 0, reasons: {}, retained: 0, sent: 0, skipped: 0 };
};

/**
 * Flush buffered trajectories, oldest first, one per POST, stopping at the
 * deadline (`budgetMs`; null means unbounded). Whatever cannot be sent stays
 * buffered; whatever the server rejects moves to dead-letter. Never throws.
 *
 * @public
 */
export const drainBufferedTrajectories = async ({
  authToken: authTokenOverride,
  budgetMs = 500,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  jsonlPath,
  nowFn = Date.now,
  repoRoot,
  timeoutMs,
}: {
  authToken?: string;
  budgetMs?: number | null;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  nowFn?: () => number;
  repoRoot: string;
  timeoutMs?: number;
}): Promise<DrainFileResult> => {
  try {
    if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1') {
      return emptyDrain();
    }
    const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
    if (!graphqlUrl) {
      return emptyDrain();
    }
    const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
    const resolvedTimeout = resolveTrajectoryTimeout(timeoutMs);

    return await drainJsonlFile<TrajectoryInput>({
      deadlineMs: budgetMs == null ? undefined : nowFn() + budgetMs,
      filePath: jsonlPath || defaultTrajectoriesJsonlPath(),
      nowFn,
      post: (input) => {
        return postTrajectory({
          authToken,
          fetchImpl,
          graphqlUrl,
          input,
          timeoutMs: resolvedTimeout,
        });
      },
    });
  } catch (err) {
    logHookError('drainBufferedTrajectories failed', err);
    return emptyDrain();
  }
};
