/**
 * Agent trajectory delivery: POST one task's trajectory to
 * `recordAgentTrajectory`, buffer it when the server cannot take it right now,
 * dead-letter it when the server rejects the payload itself, and drain the
 * buffer later. Same failure classification and buffer mechanics as the other
 * telemetry streams (see `graphql.ts` and `jsonl.ts`). Nothing here throws.
 */
import { resolveAuthToken, resolveGraphqlUrl } from '../config/env.ts';
import type { DrainFileResult, HookFetch, PostResult } from '../types.ts';
import { logHookError } from '../utils/logging.ts';
import { postGraphqlMutation } from './graphql.ts';
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
