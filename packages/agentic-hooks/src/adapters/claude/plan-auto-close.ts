/**
 * Claude Code plan auto-close report (PostToolUse hook).
 *
 * Registered on OT's `update_task`. When the call completed a task and that
 * closed the task's plan, prints `additionalContext` telling the agent to
 * reopen the plan before adding follow-up tasks. The decision lives in
 * `./plan-auto-close-output.ts`.
 *
 * Every path, including any internal failure or an unreachable OT, prints
 * nothing: the note is a courtesy, never a gate.
 */
import fs from 'node:fs';

import {
  logHookError,
  lookupTaskPlan,
  resolveAuthToken,
  resolveGraphqlUrl,
} from '../../index.ts';
import { decideClaudePlanAutoClose } from './plan-auto-close-output.ts';

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
      logHookError('plan-auto-close: invalid JSON stdin', err);
      return;
    }

    const output = await decideClaudePlanAutoClose(raw, (taskId) =>
      lookupTaskPlan({
        authToken: resolveAuthToken(repoRoot),
        graphqlUrl: resolveGraphqlUrl(repoRoot),
        taskId,
        timeoutMs: LOOKUP_TIMEOUT_MS,
      }),
    );
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError('plan-auto-close failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
