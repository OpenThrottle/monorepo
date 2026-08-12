/**
 * @description Claude Code CLI driver: headless/print mode (`claude -p …`). Ported byte-for-byte
 * from tools/workflows' `buildClaudeShellCommand`. Uses `--permission-mode acceptEdits` so common
 * file edits don't block; omits `--model` when unset or `auto` (Claude uses its own defaults).
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities, DriverModelListing } from '../types/index.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';
import { appendWorktreeShellFlags } from '../utils/worktree.ts';

const capabilities: DriverCapabilities = {
  chatStreaming: true,
  permissionMode: true,
  skipWorktreeSetup: false,
  supportsCustomBaseUrl: false,
  supportsModelFlag: true,
  worktree: true,
  worktreeBase: false,
};

/**
 * Claude Code has no machine-listable models command (verified against 2.1.220: `--model` takes an
 * alias like `opus`/`sonnet` or a full name, and there is no `claude models` subcommand). Surface a
 * static list of the stable CLI aliases so the picker has options.
 */
const discoverModels: DriverModelListing = {
  mode: 'static',
  models: ['opus', 'sonnet', 'haiku', 'fable'],
};

/**
 * @description Claude Code driver (`claude`, label `claude-code`).
 * @public
 */
export const claudeDriver = defineDriver({
  binEnv: 'OPENTHROTTLE_CLAUDE_BIN',
  binary: 'claude',
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
  discoverModels,
  id: 'claude',
  install: {
    installerShell: 'bash',
    method: 'curl-shell',
    url: 'https://claude.ai/install.sh',
  },
  label: 'claude-code',
  update: { argv: ['update'], method: 'command' },
  versionArgs: ['--version'],
});
