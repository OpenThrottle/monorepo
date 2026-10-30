/**
 * The backfill's control flow, separated from `process` so it can be driven
 * from a test: scan, print the counts, and send only when this is not a dry
 * run. `backfill.ts` is the thin entrypoint that feeds it argv and stdio.
 */
import type { HookFetch } from '../../index.ts';
import type { BackfillOptions } from './backfill-args.ts';
import { formatBackfillPlan, formatBackfillResult } from './backfill-report.ts';
import {
  resolveBackfillEndpoint,
  scanBackfill,
  sendBackfill,
} from './transcript-backfill.ts';

/**
 * Run one backfill and return the process exit code. The plan's counts are
 * written BEFORE any request, so an operator who interrupts has already seen
 * what was about to go out. A dry run returns right after printing them and
 * never builds an endpoint, a request or a buffer file.
 *
 * `endpoint` and `fetchImpl` are injectable for tests; by default the endpoint
 * is resolved like the hooks resolve theirs.
 *
 * @public
 */
export const runBackfill = async ({
  endpoint,
  fetchImpl,
  options,
  stderr,
  stdout,
}: {
  endpoint?: { authToken: string; graphqlUrl: string } | null;
  fetchImpl?: HookFetch;
  options: BackfillOptions;
  stderr: (text: string) => void;
  stdout: (text: string) => void;
}): Promise<number> => {
  const plan = scanBackfill(options);
  stdout(formatBackfillPlan({ dryRun: options.dryRun, plan }));
  if (options.dryRun) {
    return 0;
  }

  const target =
    endpoint === undefined
      ? resolveBackfillEndpoint({ repoRoot: options.repoRoot })
      : endpoint;
  if (target === null) {
    stderr(
      'no OpenThrottle endpoint to send to (set OPENTHROTTLE_GRAPHQL_URL, and unset OPENTHROTTLE_TELEMETRY_OFFLINE); nothing was sent or buffered\n',
    );
    return 1;
  }

  const result = await sendBackfill({
    ...target,
    fetchImpl,
    plan,
    repoRoot: options.repoRoot,
    timeoutMs: options.timeoutMs,
  });
  stdout(formatBackfillResult(result));
  return 0;
};
