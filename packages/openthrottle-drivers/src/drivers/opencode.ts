/**
 * @description OpenCode CLI driver: headless mode (`opencode run "<prompt>"`). Closes the backend
 * that previously threw `Unsupported execution backend`. Verified against the installed CLI
 * (opencode 1.18.5, `opencode run --help`): the prompt is a positional message, `-m/--model` takes
 * `provider/model`, and `--auto` auto-approves permissions (the headless analog of Claude's
 * `--permission-mode acceptEdits` / Cursor's `--force`). OpenCode exposes NO agent-worktree flags.
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities } from '../types/index.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';

const capabilities: DriverCapabilities = {
  permissionMode: true,
  skipWorktreeSetup: false,
  supportsModelFlag: true,
  worktree: false,
  worktreeBase: false,
};

/**
 * @description OpenCode driver (`opencode`, label `opencode`). `--auto` keeps the agentic loop
 * non-blocking; `--model` is omitted when unset or `auto` (OpenCode has no `auto` alias).
 * @public
 */
export const opencodeDriver = defineDriver({
  buildShellCommand: (config) => {
    const modelNorm = config.model?.trim() ?? '';
    const modelFlag =
      modelNorm !== '' && modelNorm !== 'auto'
        ? ` --model ${escapeShellArg(modelNorm)}`
        : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);

    return `opencode run --auto "${safePrompt}"${modelFlag}`;
  },
  capabilities,
  id: 'opencode',
  label: 'opencode',
});
