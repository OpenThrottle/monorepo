/**
 * @description xAI Grok CLI driver: single-turn headless mode (`grok -p "<prompt>"`, which prints
 * the response to stdout and exits). Verified against the installed CLI (grok 0.2.112, `grok --help`):
 * `-p/--single <PROMPT>` is the headless flag, `-m/--model` selects the model, `--permission-mode`
 * accepts `acceptEdits` (used here for non-blocking edits, matching Claude), and `-w/--worktree`
 * takes an optional name. Grok's worktree base flag is `--worktree-ref` (NOT `--worktree-base`), so
 * this driver advertises `worktree:true` but `worktreeBase:false`; wiring `--worktree-ref` through
 * the shared formatter is a follow-up (would need a per-driver base-flag name).
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities, DriverModelListing } from '../types/index.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';
import { appendWorktreeShellFlags } from '../utils/worktree.ts';

const capabilities: DriverCapabilities = {
  chatStreaming: false,
  permissionMode: true,
  skipWorktreeSetup: false,
  supportsModelFlag: true,
  worktree: true,
  worktreeBase: false,
};

/**
 * `grok models` prints an `Available models:` header then bulleted `  * <id> (default)` rows
 * (verified against 0.2.112). Capture the id after the bullet, strip a trailing ` (default)`.
 * Listing requires login, so this tolerantly yields `[]` when logged out.
 */
const discoverModels: DriverModelListing = {
  argv: ['models'],
  mode: 'command',
  parse: (stdout) =>
    stdout
      .split('\n')
      .map((line) => /^\s*\*\s+(\S+)/.exec(line)?.[1])
      .filter((id): id is string => id !== undefined),
};

/**
 * @description Grok driver (`grok`, label `grok`). Model flag omitted when unset or `auto`.
 * @public
 */
export const grokDriver = defineDriver({
  binEnv: 'OPENTHROTTLE_GROK_BIN',
  binary: 'grok',
  buildShellCommand: (config) => {
    const modelNorm = config.model?.trim() ?? '';
    const modelFlag =
      modelNorm !== '' && modelNorm !== 'auto'
        ? ` --model ${escapeShellArg(modelNorm)}`
        : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);
    const base = `grok -p "${safePrompt}" --permission-mode acceptEdits${modelFlag}`;

    return appendWorktreeShellFlags(base, capabilities, config.worktree);
  },
  capabilities,
  discoverModels,
  id: 'grok',
  label: 'grok',
  versionArgs: ['--version'],
});
