/**
 * @description Cursor CLI driver: non-interactive mode (`cursor-agent --force -p …`). Ported
 * byte-for-byte from tools/workflows' `buildCursorShellCommand`. Unlike Claude, Cursor emits
 * `--model` for any non-empty value (including `auto`), and supports the Cursor-only
 * `--worktree-base` / `--skip-worktree-setup` flags.
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities } from '../types/index.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';
import { appendWorktreeShellFlags } from '../utils/worktree.ts';

const capabilities: DriverCapabilities = {
  permissionMode: false,
  skipWorktreeSetup: true,
  supportsModelFlag: true,
  worktree: true,
  worktreeBase: true,
};

/**
 * @description Cursor driver (`cursor`, label `cursor-agent`).
 * @public
 */
export const cursorDriver = defineDriver({
  buildShellCommand: (config) => {
    const modelFlag = config.model
      ? ` --model ${escapeShellArg(config.model)}`
      : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);
    const base = `cursor-agent --force -p "${safePrompt}"${modelFlag}`;

    return appendWorktreeShellFlags(base, capabilities, config.worktree);
  },
  capabilities,
  id: 'cursor',
  label: 'cursor-agent',
});
