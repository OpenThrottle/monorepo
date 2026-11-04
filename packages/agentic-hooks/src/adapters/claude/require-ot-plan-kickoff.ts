/**
 * Claude Code plan-less session kickoff guard (PreToolUse hook).
 *
 * Registered on the session-spawning tools (`start_session`,
 * `hand_off_to_session`). Denies a kickoff whose brief does not start with
 * `/ot-loop <planUuid>`, so follow-up work an agent starts lands in an
 * OpenThrottle plan instead of a free-form session OT never sees. The decision
 * itself lives in `./kickoff-guard.ts`.
 *
 * Denies by printing the PreToolUse `permissionDecision: "deny"` JSON on stdout.
 * Every other path, including any internal failure or an unreachable OT, allows:
 * a guard that blocks kickoffs because it crashed is worse than one plan-less
 * session.
 */
import fs from 'node:fs';

import {
  logHookError,
  lookupOtId,
  resolveAuthToken,
  resolveGraphqlUrl,
} from '../../index.ts';
import { decideKickoff } from './kickoff-guard.ts';

const LOOKUP_TIMEOUT_MS = 1500;

const main = async (): Promise<void> => {
  try {
    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) return;

    let raw: unknown;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('require-ot-plan-kickoff: invalid JSON stdin', err);
      return;
    }

    const result = await decideKickoff(raw, (id) =>
      lookupOtId({
        authToken: resolveAuthToken(repoRoot),
        graphqlUrl: resolveGraphqlUrl(repoRoot),
        id,
        timeoutMs: LOOKUP_TIMEOUT_MS,
      }),
    );
    if (result.decision !== 'deny') return;

    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: result.reason,
        },
      })}\n`,
    );
  } catch (err) {
    logHookError('require-ot-plan-kickoff failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
