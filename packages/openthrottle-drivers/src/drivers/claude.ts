/**
 * @description Claude Code CLI driver: headless/print mode (`claude -p …`). Uses `--permission-mode acceptEdits` so common
 * file edits don't block; omits `--model` when unset or `auto` (Claude uses its own defaults).
 * Emits `--output-format stream-json --verbose` and supplies `parseOutput` so a subscription usage
 * limit is detectable (see `utils/claude-output.ts`).
 */

import { defineDriver } from '../registry/index.ts';
import type {
  DriverCapabilities,
  DriverModelListing,
  DriverRepoAgentConfig,
} from '../types/index.ts';
import {
  parseClaudeStreamJsonOutput,
  renderClaudeStreamJsonLine,
} from '../utils/claude-output.ts';
import { claudeContainmentShellFlags } from '../utils/containment.ts';
import { claudeEffortFlag } from '../utils/reasoning-effort.ts';
import {
  escapeForShellDoubleQuoted,
  escapeShellArg,
  formatModelFlag,
} from '../utils/shell.ts';
import {
  appendPluginDirShellFlags,
  appendWorktreeShellFlags,
  OPENTHROTTLE_CLAUDE_PLUGIN_DIR_RELS,
} from '../utils/shell-flags.ts';

const capabilities: DriverCapabilities = {
  /** Reads the workspace's `.mcp.json` automatically in headless `-p` mode (verified 2.1.232). */
  attachesWorkspaceMcp: true,
  chatStreaming: true,
  /**
   * Verified against Claude Code 2.1.325: `--settings '<json>'` enables the OS sandbox (Seatbelt on
   * macOS, bubblewrap on Linux) with write roots and an `allowedDomains` egress list, merged
   * additively — see `utils/containment.ts`. `--settings` still applies under the isolation
   * posture's `--setting-sources user`.
   */
  containment: { filesystem: true, networkAllowlist: true, networkDeny: true },
  /**
   * Verified live against Claude Code 2.1.325 (2026-11-22) in a fixture repo: `--setting-sources
   * user` stops the repo's `.claude/settings.json` (and `settings.local.json`) hooks, permissions and
   * enabled plugins from loading, and `--strict-mcp-config --mcp-config <json>` stops its `.mcp.json`
   * servers from spawning — while `--plugin-dir` hooks and the inline servers still load. See
   * {@link buildClaudeIsolationFlags}.
   */
  isolatesRepoAgentConfig: true,
  /**
   * No flag needed — verified against Claude Code 2.1.232. In headless `-p` mode the CLI loads the
   * workspace's project `.mcp.json` automatically and connects its servers with no approval step
   * and no per-path state written to `~/.claude.json`; `claude mcp list` in a first-seen worktree
   * reports the project-only servers as connected. `--permission-mode acceptEdits` (already emitted)
   * is likewise sufficient to CALL an MCP tool — tool permission is not a separate axis here.
   *
   * So unlike Cursor, Claude needs nothing for a TRUSTED checkout: `--mcp-config` /
   * `--strict-mcp-config` would suppress the project file it relies on, so a trusted run never emits
   * them. An UNTRUSTED checkout's run emits them on purpose, with OT's own servers inline — that is
   * the trust gate ({@link buildClaudeIsolationFlags}), not MCP attachment.
   */
  mcpAutoApprove: false,
  permissionMode: true,
  /**
   * Verified against Claude Code 2.1.232: `--plugin-dir <path>` loads a plugin (hooks + skills +
   * MCP) from an absolute directory outside the working tree, and its hooks fire in headless `-p`
   * mode ADDITIVELY alongside any hooks the target repo defines in its own `.claude/settings.json`
   * — the no-clobber guarantee is a property of the CLI's merge, not of anything we do. Note that
   * `--bare` would skip hooks and plugins outright; this driver must never emit it.
   */
  pluginDir: true,
  reportsToolCalls: true,
  skipWorktreeSetup: false,
  supportsCustomBaseUrl: false,
  supportsModelFlag: true,
  worktree: true,
  worktreeBase: false,
};

/**
 * @description Flags that keep an untrusted checkout's own agent config from loading:
 * `--setting-sources user` skips the project and local settings files (their hooks, permissions
 * and enabled plugins), and `--strict-mcp-config --mcp-config <json>` makes the inline OT servers
 * the only MCP source, so the repo's `.mcp.json` never spawns. `--plugin-dir` is unaffected, so
 * OT's own hooks still load. Empty for a trusted (or unspecified) posture, which keeps a trusted
 * run's command byte-identical to the one before the trust gate.
 */
const buildClaudeIsolationFlags = (
  posture: DriverRepoAgentConfig | undefined,
): string => {
  if (posture?.kind !== 'isolated') {
    return '';
  }

  const mcpConfig = JSON.stringify({ mcpServers: posture.mcpServers });

  return ` --setting-sources user --strict-mcp-config --mcp-config ${escapeShellArg(mcpConfig)}`;
};

/** `--verbose` is required by the CLI for `stream-json` under `--print`. */
const STREAM_JSON_FLAGS = '--output-format stream-json --verbose';

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
    const modelFlag = formatModelFlag(config.model);

    const effort = claudeEffortFlag(config.effort);
    const effortFlag = effort !== undefined ? ` --effort ${effort}` : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);
    // `--output-format stream-json --verbose` sits right after the prompt (before `--model`): text
    // mode hides the `rate_limit_event` / 429 `result` that signal a usage limit. `parseOutput`
    // below recovers the text-mode stdout from the terminal `result` event, so callers are unchanged.
    const base = `${escapeShellArg(config.bin ?? 'claude')} -p --permission-mode acceptEdits "${safePrompt}" ${STREAM_JSON_FLAGS}${modelFlag}${effortFlag}`;

    // `--effort` follows `--model`. `--plugin-dir` sits after them and before the worktree flags, matching where cursor
    // threads its MCP flags — the position is asserted in the parity tests, not incidental.
    const withPlugins = appendPluginDirShellFlags(
      base,
      capabilities,
      config.pluginDirs,
    );
    // The isolation flags follow `--plugin-dir` and precede the worktree flags.
    const isolated = `${withPlugins}${buildClaudeIsolationFlags(config.repoAgentConfig)}`;

    // Containment follows the isolation flags and precedes the worktree flags; absent, it adds
    // nothing, so the command stays byte-identical to the parity fixtures.
    const contained = `${isolated}${claudeContainmentShellFlags(config.containment)}`;

    return appendWorktreeShellFlags(contained, capabilities, config.worktree);
  },
  capabilities,
  discoverModels,
  // An API-key login and an operator-isolated config dir; a subscription login is found through `HOME` + `USER` (Keychain).
  hostEnv: {
    keys: ['ANTHROPIC_API_KEY', 'CLAUDE_CONFIG_DIR'],
    prefixes: [],
  },
  id: 'claude',
  install: {
    installerShell: 'bash',
    method: 'curl-shell',
    url: 'https://claude.ai/install.sh',
  },
  label: 'claude-code',
  parseOutput: parseClaudeStreamJsonOutput,
  pluginDirRels: OPENTHROTTLE_CLAUDE_PLUGIN_DIR_RELS,
  renderOutputLine: renderClaudeStreamJsonLine,
  update: { argv: ['update'], method: 'command' },
  versionArgs: ['--version'],
});
