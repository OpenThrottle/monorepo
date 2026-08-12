/**
 * @description Cursor CLI driver: non-interactive mode (`cursor-agent --force -p …`). Ported
 * byte-for-byte from tools/workflows' `buildCursorShellCommand`. Unlike Claude, Cursor emits
 * `--model` for any non-empty value (including `auto`), and supports the Cursor-only
 * `--worktree-base` / `--skip-worktree-setup` flags.
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities, DriverModelListing } from '../types/index.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';
import { appendWorktreeShellFlags } from '../utils/worktree.ts';

const capabilities: DriverCapabilities = {
  chatStreaming: true,
  permissionMode: false,
  skipWorktreeSetup: true,
  supportsCustomBaseUrl: false,
  supportsModelFlag: true,
  worktree: true,
  worktreeBase: true,
};

/**
 * `cursor-agent models` prints a `Available models` header, a blank line, then one `<id> - <Label>`
 * row per model (verified against 2026.07.23). Capture the id token before ` - `; skip the header
 * and blanks.
 */
const discoverModels: DriverModelListing = {
  argv: ['models'],
  mode: 'command',
  parse: (stdout) =>
    stdout
      .split('\n')
      .map((line) => /^(\S+) - /.exec(line.trim())?.[1])
      .filter((id): id is string => id !== undefined),
};

/**
 * @description Cursor driver (`cursor`, label `cursor-agent`).
 * @public
 */
export const cursorDriver = defineDriver({
  binEnv: 'OPENTHROTTLE_CURSOR_AGENT_BIN',
  binary: 'cursor-agent',
  buildShellCommand: (config) => {
    const modelFlag = config.model
      ? ` --model ${escapeShellArg(config.model)}`
      : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);
    const base = `cursor-agent --force -p "${safePrompt}"${modelFlag}`;

    return appendWorktreeShellFlags(base, capabilities, config.worktree);
  },
  capabilities,
  discoverModels,
  id: 'cursor',
  install: {
    installerShell: 'bash',
    method: 'curl-shell',
    url: 'https://cursor.com/install',
  },
  label: 'cursor-agent',
  update: { method: 'curl-shell' },
  versionArgs: ['--version'],
});
