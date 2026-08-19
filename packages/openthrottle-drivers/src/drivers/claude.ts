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
  /** Reads the workspace's `.mcp.json` automatically in headless `-p` mode (verified 2.1.232). */
  attachesWorkspaceMcp: true,
  chatStreaming: true,
  /**
   * No flag needed — verified against Claude Code 2.1.232. In headless `-p` mode the CLI loads the
   * workspace's project `.mcp.json` automatically and connects its servers with no approval step
   * and no per-path state written to `~/.claude.json`; `claude mcp list` in a first-seen worktree
   * reports the project-only servers as connected. `--permission-mode acceptEdits` (already emitted)
   * is likewise sufficient to CALL an MCP tool — tool permission is not a separate axis here.
   *
   * So unlike Cursor, Claude needs nothing: `--mcp-config` / `--strict-mcp-config` exist but are for
   * overriding discovery, and `--strict-mcp-config` would actively HARM us by suppressing the
   * project file. Do not add them here. (The chat composer does use them, deliberately, to pin an
   * explicit server allowlist — a different goal.)
   */
  mcpAutoApprove: false,
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
