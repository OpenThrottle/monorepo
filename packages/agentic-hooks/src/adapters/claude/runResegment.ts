/**
 * The resegment CLI's control flow, separated from `process` so it can be
 * driven from a test: plan each session, print the old/new step counts, and
 * write only when this is not a dry run.
 */
import type { HookFetch } from '../../index.ts';
import type { ResegmentOptions } from './resegment-args.ts';
import {
  formatResegmentPlan,
  formatResegmentResult,
} from './resegment-report.ts';
import {
  applySessionResegment,
  planSessionResegment,
} from './resegment-session.ts';
import { resolveBackfillEndpoint } from './transcript-backfill.ts';

const pickEndpoint = (
  injected: { authToken: string; graphqlUrl: string } | null | undefined,
  repoRoot: string,
): { authToken: string; graphqlUrl: string } | null => {
  if (injected === undefined) {
    return resolveBackfillEndpoint({ repoRoot });
  }
  return injected;
};

/**
 * Run one resegment across the requested sessions and return the process exit
 * code. Dry-run still talks to the server for the old step counts, but writes
 * nothing.
 *
 * @public
 */
export const runResegment = async ({
  endpoint,
  fetchImpl,
  options,
  stderr,
  stdout,
}: {
  endpoint?: { authToken: string; graphqlUrl: string } | null;
  fetchImpl?: HookFetch;
  options: ResegmentOptions;
  stderr: (text: string) => void;
  stdout: (text: string) => void;
}): Promise<number> => {
  const target = pickEndpoint(endpoint, options.repoRoot);
  if (target === null) {
    stderr(
      'no OpenThrottle endpoint (set OPENTHROTTLE_GRAPHQL_URL, and unset OPENTHROTTLE_TELEMETRY_OFFLINE); nothing was planned or written\n',
    );
    return 1;
  }

  let exitCode = 0;
  for (const sessionId of options.sessionIds) {
    // eslint-disable-next-line no-await-in-loop -- one session at a time so the report stays readable
    const planned = await planSessionResegment({
      authToken: target.authToken,
      fetchImpl,
      graphqlUrl: target.graphqlUrl,
      projectsDir: options.projectsDir,
      sessionId,
      timeoutMs: options.timeoutMs,
    });
    if (planned.kind === 'error') {
      stderr(`${planned.error}\n`);
      exitCode = 1;
      continue;
    }

    stdout(formatResegmentPlan({ dryRun: options.dryRun, plan: planned.plan }));
    if (options.dryRun) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop -- sequential per session
    const result = await applySessionResegment({
      authToken: target.authToken,
      fetchImpl,
      graphqlUrl: target.graphqlUrl,
      plan: planned.plan,
      timeoutMs: options.timeoutMs,
    });
    stdout(formatResegmentResult(result));
    if (result.failed > 0) {
      exitCode = 1;
    }
  }

  return exitCode;
};
