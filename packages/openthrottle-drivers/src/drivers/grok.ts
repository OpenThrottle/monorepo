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
   * Reads the workspace's `.mcp.json` — verified against grok 1.0.0 (3cd0d0cbcebe) via
   * `grok mcp doctor`, which lists `.mcp.json` as a first-class config source and handshakes
   * `openthrottle-mcp` from it (62 tools discovered).
   *
   * Do NOT use `grok mcp list` to check this: it reports only servers in grok's own TOML config, so
   * with no `.grok/config.toml` present it prints "No MCP servers configured" even though `.mcp.json`
   * servers are live. That output is what first led this audit to the wrong conclusion. The proof
   * that the project file (not some user-scope config) is the source: `maestro` exists in NO
   * user-level config on the audited host, yet grok handshakes it.
   *
   * Caveat on evidence grade: `grok mcp doctor` is grok's own account of its MCP configuration, but
   * the agent-runtime check — spawn the driver's command and ask the model which tools it has, as was
   * done for cursor, claude and opencode — was blocked by grok's free-tier usage limit. Re-run it
   * when quota allows to close the gap.
   */
  attachesWorkspaceMcp: true,
  chatStreaming: true,
  /**
   * No flag needed and none exists — verified against grok 1.0.0 (3cd0d0cbcebe). Grok loads the
   * workspace's `.mcp.json` with no approval step and no per-server gate, so there is nothing for
   * this driver to emit; see {@link DriverCapabilities.attachesWorkspaceMcp} above for the evidence.
   *
   * A project-scope `./.grok/config.toml` (via `grok mcp add --scope project`) would ALSO work, but
   * it is unnecessary duplication of `.mcp.json` and would add a new committed agent-config directory
   * for no gain. Deliberately not added.
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
