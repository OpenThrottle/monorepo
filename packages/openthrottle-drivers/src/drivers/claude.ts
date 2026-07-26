/**
 * @description Claude Code CLI driver: headless/print mode (`claude -p …`). Ported byte-for-byte
 * from tools/workflows' `buildClaudeShellCommand`. Uses `--permission-mode acceptEdits` so common
 * file edits don't block; omits `--model` when unset or `auto` (Claude uses its own defaults).
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
 * @description Claude Code driver (`claude`, label `claude-code`).
 * @public
 */
export const claudeDriver = defineDriver({
  buildShellCommand: (config) => {
    const modelNorm = config.model?.trim() ?? '';
    const modelFlag =
      modelNorm !== '' && modelNorm !== 'auto'
        ? ` --model ${escapeShellArg(modelNorm)}`
        : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);
    const base = `claude -p --permission-mode acceptEdits "${safePrompt}"${modelFlag}`;

    return appendWorktreeShellFlags(base, capabilities, config.worktree);
  },
  capabilities,
  id: 'claude',
  label: 'claude-code',
});
