/**
 * Claude Code bash guard (PreToolUse hook, matcher `Bash`).
 *
 * Evaluates every shell command against the neutral bash-guard rule registry
 * (`data/bash-guard/`) before it runs: one hook, many rules. A deny prints the
 * PreToolUse `permissionDecision: "deny"` JSON on stdout; a warn prints
 * `additionalContext`; an allow prints nothing. The payload handling and
 * rendering live in `./bash-guard-output.ts`.
 *
 * Every other path, including any internal failure, allows: a guard that blocks
 * commands because it crashed is worse than no guard.
 */
import fs from 'node:fs';

import {
  createGhPrLookup,
  GH_PR_LOOKUP_TIMEOUT_MS,
  logHookError,
} from '../../index.ts';
import { decideClaudeBashGuard } from './bash-guard-output.ts';

const main = async (): Promise<void> => {
  try {
    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) return;

    let raw: unknown;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('bash-guard: invalid JSON stdin', err);
      return;
    }

    const fallbackCwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const output = await decideClaudeBashGuard(raw, fallbackCwd, {
      lookupPullRequest: createGhPrLookup(),
      lookupTimeoutMs: GH_PR_LOOKUP_TIMEOUT_MS,
    });
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError('bash-guard failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
