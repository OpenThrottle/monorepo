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
import {
  escapeForShellDoubleQuoted,
  escapeShellArg,
  formatShellEnvPrefix,
} from '../utils/shell.ts';
import { appendWorktreeShellFlags } from '../utils/worktree.ts';

const capabilities: DriverCapabilities = {
  /**
   * Reads `~/.grok/config.toml` (user) or `./.grok/config.toml` (project) — never `.mcp.json`. The
   * repo ships no project config, so a grok run reaches no OT servers (verified 1.0.0).
   */
  attachesWorkspaceMcp: false,
  chatStreaming: true,
  /**
   * No flag exists — verified against grok 1.0.0 (3cd0d0cbcebe). Grok resolves MCP servers from its
   * own TOML config, at either `~/.grok/config.toml` (user scope) or `./.grok/config.toml` (project
   * scope, via `grok mcp add --scope project`). It does not read `.mcp.json`, so attachment is a
   * configuration question, not a command-line one — there is nothing for this driver to emit.
   *
   * As of this audit the repo ships NO `./.grok/config.toml`, and `grok mcp list` reports "No MCP
   * servers configured". A grok run therefore has no OT tools today. Unlike codex, the fix is cheap
   * and lives in the repo rather than on the host: commit a project-scope `.grok/config.toml`
   * mirroring `.mcp.json`. Tracked as a follow-up to plan a08e7d24, not done here — this task's
   * scope is the driver contract.
   */
  mcpAutoApprove: false,
  permissionMode: true,
  skipWorktreeSetup: false,
  supportsCustomBaseUrl: true,
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
 * @description Grok driver (`grok`, label `grok`). Model flag omitted when unset or `auto`. When a
 * local endpoint is supplied, grok is redirected at it via the `GROK_MODELS_BASE_URL` +
 * `XAI_API_KEY` env pair (see the Custom Models docs) — the model list is fetched from
 * `{baseUrl}/models` and `--model` selects the discovered id. `XAI_API_KEY` defaults to a
 * placeholder since local servers ignore it. The env prefix is baked into the command string
 * because the engine spawns without an `env` override.
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

    const endpointPrefix = config.endpoint
      ? formatShellEnvPrefix({
          GROK_MODELS_BASE_URL: config.endpoint.baseUrl,
          XAI_API_KEY: config.endpoint.apiKey?.trim() || 'local',
        })
      : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);
    const base = `${endpointPrefix}grok -p "${safePrompt}" --permission-mode acceptEdits${modelFlag}`;

    return appendWorktreeShellFlags(base, capabilities, config.worktree);
  },
  capabilities,
  discoverModels,
  id: 'grok',
  install: {
    installerShell: 'bash',
    method: 'curl-shell',
    url: 'https://x.ai/cli/install.sh',
  },
  label: 'grok',
  update: { argv: ['update'], method: 'command' },
  versionArgs: ['--version'],
});
