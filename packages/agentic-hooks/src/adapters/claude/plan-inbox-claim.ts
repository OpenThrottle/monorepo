/**
 * Claude Code plan-inbox claim (PreToolUse hook, matcher `Bash|Agent|Task`).
 *
 * During a plan run, right before a subagent delegation or a destructive Bash
 * command, claims the plan's pending inbox messages so a human's STEER is seen
 * before the step runs rather than at the next task boundary. The decision
 * lives in `./plan-inbox-claim-output.ts`.
 *
 * Every path, including any internal failure, no endpoint, no token or a
 * timeout, prints nothing and exits 0.
 */
import fs from 'node:fs';

import {
  claimPlanInbox,
  logHookError,
  resolveAuthToken,
  resolveGraphqlUrl,
} from '../../index.ts';
import { decideClaudePlanInboxClaim } from './plan-inbox-claim-output.ts';

const CLAIM_TIMEOUT_MS = 2000;

const main = async (): Promise<void> => {
  try {
    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) return;

    let raw: unknown;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('plan-inbox-claim: invalid JSON stdin', err);
      return;
    }

    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();
    const output = await decideClaudePlanInboxClaim(raw, {
      claim: (target) =>
        claimPlanInbox({
          authToken: resolveAuthToken(repoRoot),
          graphqlUrl: resolveGraphqlUrl(repoRoot),
          target,
          timeoutMs: CLAIM_TIMEOUT_MS,
        }),
      nowMs: () => Date.now(),
    });
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError('plan-inbox-claim failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
