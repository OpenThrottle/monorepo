/**
 * Cursor bash guard (`beforeShellExecution` hook).
 *
 * Evaluates every shell command against the same neutral bash-guard rule
 * registry the Claude Code `PreToolUse` hook uses. The payload mapping and the
 * response rendering live in `./bash-guard-output.ts`.
 *
 * Cursor blocks a permission hook's action on invalid or missing JSON, so this
 * entrypoint prints exactly one complete response on every path, and any
 * internal failure prints an explicit allow: a guard that blocks commands
 * because it crashed is worse than no guard.
 */
import fs from 'node:fs';

import {
  createGhPrLookup,
  GH_PR_LOOKUP_TIMEOUT_MS,
  logHookError,
} from '../../index.ts';
import {
  CURSOR_SHELL_ALLOW,
  decideCursorBashGuard,
} from './bash-guard-output.ts';

const decide = async (): Promise<string> => {
  const stdinBuf = fs.readFileSync(0, 'utf8');
  if (!stdinBuf || !stdinBuf.trim()) return CURSOR_SHELL_ALLOW;

  let raw: unknown;
  try {
    raw = JSON.parse(stdinBuf);
  } catch (err) {
    logHookError('bash-guard: invalid JSON stdin', err);
    return CURSOR_SHELL_ALLOW;
  }

  const fallbackCwd = process.env.CURSOR_PROJECT_DIR || process.cwd();
  return decideCursorBashGuard(raw, fallbackCwd, {
    lookupPullRequest: createGhPrLookup(),
    lookupTimeoutMs: GH_PR_LOOKUP_TIMEOUT_MS,
  });
};

const main = async (): Promise<void> => {
  let output = CURSOR_SHELL_ALLOW;
  try {
    output = await decide();
  } catch (err) {
    logHookError('bash-guard failed', err);
  }
  process.stdout.write(output);
};

main().finally(() => {
  process.exit(0);
});
