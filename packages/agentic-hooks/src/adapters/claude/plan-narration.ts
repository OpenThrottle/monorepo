/**
 * Claude Code plan narration (PostToolUse on OT's `update_task`, and Stop).
 *
 * During a plan run, writes a short labelled chunk to the plan's output stream
 * when a task changes status and the model has not narrated it since its last
 * transition, and on Stop writes one summary per task the run moved with no
 * narration at all. One bundle serves both events because they share the
 * transcript read, the per-session state and the append call. It is kept apart
 * from `plan-auto-close` (same PostToolUse matcher) because that hook answers
 * the model from an OT lookup while this one only writes, and the two should
 * fail independently. The decision lives in `./plan-narration-output.ts`.
 *
 * Every path, including any internal failure, no endpoint, no token or a
 * timeout, prints nothing and exits 0.
 */
import fs from 'node:fs';

import {
  appendPlanNarration,
  logHookError,
  resolveAuthToken,
  resolveGraphqlUrl,
} from '../../index.ts';
import { runClaudePlanNarration } from './plan-narration-output.ts';

const APPEND_TIMEOUT_MS = 2000;

const main = async (): Promise<void> => {
  try {
    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) return;

    let raw: unknown;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('plan-narration: invalid JSON stdin', err);
      return;
    }

    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();
    await runClaudePlanNarration(raw, {
      append: (chunk) =>
        appendPlanNarration({
          authToken: resolveAuthToken(repoRoot),
          chunk,
          graphqlUrl: resolveGraphqlUrl(repoRoot),
          timeoutMs: APPEND_TIMEOUT_MS,
        }),
      nowMs: () => Date.now(),
    });
  } catch (err) {
    logHookError('plan-narration failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
