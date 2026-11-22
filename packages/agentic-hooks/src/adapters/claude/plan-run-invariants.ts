/**
 * Claude Code plan-run invariant guards (PreToolUse on OT's `update_task`,
 * and Stop).
 *
 * During a plan run, warns when a task is about to go IN_PROGRESS while
 * another task still is, and at the end of a turn when a task is left
 * IN_PROGRESS after its work was committed. It never denies and never changes
 * a task. The decision lives in `./plan-run-invariants-output.ts`.
 *
 * Every path, including any internal failure, no endpoint, no token or a
 * timeout, prints nothing and exits 0.
 */
import fs from 'node:fs';

import {
  logHookError,
  lookupInProgressTaskIds,
  resolveAuthToken,
  resolveGraphqlUrl,
} from '../../index.ts';
import { decideClaudePlanRunInvariants } from './plan-run-invariants-output.ts';

const LOOKUP_TIMEOUT_MS = 1500;

const main = async (): Promise<void> => {
  try {
    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) return;

    let raw: unknown;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('plan-run-invariants: invalid JSON stdin', err);
      return;
    }

    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();
    const output = await decideClaudePlanRunInvariants(raw, {
      lookupInProgress: (planId) =>
        lookupInProgressTaskIds({
          authToken: resolveAuthToken(repoRoot),
          graphqlUrl: resolveGraphqlUrl(repoRoot),
          planId,
          timeoutMs: LOOKUP_TIMEOUT_MS,
        }),
    });
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError('plan-run-invariants failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
