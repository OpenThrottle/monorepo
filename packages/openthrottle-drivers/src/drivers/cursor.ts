/**
 * @description Cursor CLI driver: non-interactive mode (`cursor-agent --force -p …`). Originally a
 * byte-for-byte port of tools/workflows' `buildCursorShellCommand`; it has since diverged by adding
 * the MCP-attachment flags (see {@link CURSOR_MCP_FLAGS}). Unlike Claude, Cursor emits `--model` for
 * any non-empty value (including `auto`), and supports the Cursor-only `--worktree-base` /
 * `--skip-worktree-setup` flags.
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities, DriverModelListing } from '../types/index.ts';
import { appendMcpShellFlags } from '../utils/mcp.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';
import { appendWorktreeShellFlags } from '../utils/worktree.ts';

/**
 * Flags that attach the workspace's configured MCP servers to a headless run, verified against
 * `cursor-agent` 2026.08.11-e8db854.
 *
 * `--approve-mcps` is the one that matters and is both necessary and sufficient: without it every
 * server in `.cursor/mcp.json` is parsed but held at `not loaded (needs approval)`, so an agent
 * given an MCP-dependent job silently has no tools. Approval is otherwise granted interactively and
 * cached per workspace **path** under `~/.cursor/projects/<slug>/`, which is why this never
 * reproduced in a long-lived checkout but always fails in a fresh worktree, a container, or the
 * scheduled-job worker's cwd.
 *
 * `--trust` is a distinct axis (workspace trust, not MCP approval) and does nothing for attachment
 * on its own — it is emitted alongside to suppress the other headless prompt a first-seen path
 * hits. The chat composer's cursor backend emits it unconditionally for the same reason.
 */
const CURSOR_MCP_FLAGS: readonly string[] = ['--approve-mcps', '--trust'];

const capabilities: DriverCapabilities = {
  /**
   * Reads the workspace's `.cursor/mcp.json`. Requires {@link CURSOR_MCP_FLAGS} to actually attach,
   * and requires the run to happen in the checkout root — Cursor discovers the config by walking up
   * but SPAWNS each server with the process cwd, so relative launchers like
   * `bash ./scripts/run-openthrottle-mcp.sh` fail from a subdirectory.
   */
  attachesWorkspaceMcp: true,
  chatStreaming: true,
  mcpAutoApprove: true,
  permissionMode: false,
  pluginDir: false,
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
    const withMcp = appendMcpShellFlags(base, capabilities, CURSOR_MCP_FLAGS);

    return appendWorktreeShellFlags(withMcp, capabilities, config.worktree);
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
  update: { method: 'reinstall' },
  versionArgs: ['--version'],
});
