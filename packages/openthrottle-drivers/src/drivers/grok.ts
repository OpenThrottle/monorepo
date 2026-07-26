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
import type { DriverCapabilities } from '../types/index.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';
import { appendWorktreeShellFlags } from '../utils/worktree.ts';

const capabilities: DriverCapabilities = {
  permissionMode: true,
  skipWorktreeSetup: false,
  supportsModelFlag: true,
  worktree: true,
  worktreeBase: false,
};

/**
 * @description Grok driver (`grok`, label `grok`). Model flag omitted when unset or `auto`.
 * @public
 */
export const grokDriver = defineDriver({
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
  id: 'grok',
  label: 'grok',
});
