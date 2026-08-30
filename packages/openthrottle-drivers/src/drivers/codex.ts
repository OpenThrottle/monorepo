/**
 * @description OpenAI Codex CLI driver: non-interactive mode (`codex exec …`). Verified against the
 * installed CLI (codex-cli 0.145.0, `codex exec --help`): `codex exec [OPTIONS] [PROMPT]` runs
 * autonomously, `-m/--model` selects the model, and `-s/--sandbox` selects the filesystem policy.
 * We pass `--sandbox workspace-write` so the agent can edit the workspace without approval prompts
 * (the headless analog of Claude's `--permission-mode acceptEdits`). Codex exec exposes no
 * agent-worktree flags.
 */

import { defineDriver } from '../registry/index.ts';
import { DRIVER_ENDPOINT_KINDS } from '../types/index.ts';
import type {
  DriverCapabilities,
  DriverEndpointConfig,
} from '../types/index.ts';
import {
  escapeForShellDoubleQuoted,
  escapeShellArg,
  formatShellEnvPrefix,
} from '../utils/shell.ts';

/**
 * Provider id for the generated `[model_providers.*]` table used for a REMOTE gateway. Codex's
 * built-in `oss` provider cannot be reused: it owns an ollama/lmstudio wire adapter and is selected
 * by `--oss`, neither of which describes a hosted gateway.
 */
const REMOTE_PROVIDER_ID = 'openthrottle_remote';

/**
 * Env var the generated provider reads its bearer token from (`env_key`). Codex resolves it inside
 * the child process, so the key travels as an env assignment and never as an argv token.
 */
const REMOTE_API_KEY_ENV = 'OPENTHROTTLE_REMOTE_API_KEY';

/**
 * Wire protocol for the generated provider. `responses` is the ONLY viable value: codex-cli 0.145.0
 * REJECTS `wire_api = "chat"` at config-load time ("`wire_api = \"chat\"` is no longer supported.
 * How to fix: set `wire_api = \"responses\"`"), and OpenRouter does serve `POST /api/v1/responses`
 * — verified 2026-08-29 by an end-to-end run that reached the endpoint and was rejected only on the
 * key.
 */
const REMOTE_WIRE_API = 'responses';

/**
 * Build the `-c` overrides pointing codex at a remote gateway. JSON.stringify yields a valid
 * double-quoted TOML string literal for each value.
 */
function remoteProviderOverrides(endpoint: DriverEndpointConfig): string {
  const overrides = [
    `model_provider=${JSON.stringify(REMOTE_PROVIDER_ID)}`,
    `model_providers.${REMOTE_PROVIDER_ID}.name=${JSON.stringify(
      endpoint.provider ?? 'Remote gateway',
    )}`,
    `model_providers.${REMOTE_PROVIDER_ID}.base_url=${JSON.stringify(endpoint.baseUrl)}`,
    `model_providers.${REMOTE_PROVIDER_ID}.env_key=${JSON.stringify(REMOTE_API_KEY_ENV)}`,
    `model_providers.${REMOTE_PROVIDER_ID}.wire_api=${JSON.stringify(REMOTE_WIRE_API)}`,
  ];

  return overrides
    .map((override) => ` -c ${escapeShellArg(override)}`)
    .join('');
}

const capabilities: DriverCapabilities = {
  /**
   * Reads ONLY the user-scope `~/.codex/config.toml`; it has no project-config concept at all, so no
   * workspace file can grant it MCP access (verified codex-cli 0.147.0). Reachability is a property
   * of the host, not the checkout.
   */
  attachesWorkspaceMcp: false,
  chatStreaming: true,
  /**
   * No flag exists, and none would help — verified against codex-cli 0.147.0. Codex resolves MCP
   * servers exclusively from the `[mcp_servers.*]` tables in the USER-scope `~/.codex/config.toml`.
   * It has no notion of a project-level config: `codex mcp add` writes to that same user file, and
   * `codex mcp --help` exposes no project/scope option. The repo's `.mcp.json` / `.cursor/mcp.json`
   * are simply never read.
   *
   * Consequence: whether codex can reach `openthrottle-mcp` is a property of the HOST, not of the
   * workspace or of this command string. On a host where it is not registered in `config.toml`, a
   * codex run has no OT tools and an MCP-dependent scheduled job cannot succeed — see plan
   * a08e7d24 for the run-outcome signal that makes such a run stop reporting as a clean success.
   *
   * A `-c mcp_servers.openthrottle-mcp.command=…` override could inject it from here, but that
   * would hardcode OT-specific server wiring into a leaf driver package whose whole point is to
   * stay workspace-agnostic. Deliberately not done.
   */
  mcpAutoApprove: false,
  permissionMode: true,
  pluginDir: false,
  skipWorktreeSetup: false,
  supportsCustomBaseUrl: true,
  supportsModelFlag: true,
  worktree: false,
  worktreeBase: false,
};

/**
 * @description Codex driver (`codex`, label `codex`). Model flag is placed before the positional
 * prompt and omitted when unset or `auto`. Codex has no machine-listable models command (verified
 * against codex-cli 0.145.0: no `codex models` subcommand; `-m` takes an arbitrary MODEL), so
 * `discoverModels` is omitted and discovery reports availability-only (`models: []`).
 *
 * A LOCAL endpoint is targeted through Codex's built-in OSS provider (`--oss`), redirected at the
 * discovered `baseUrl` via a `-c model_providers.oss.base_url` override — this is preferred over a
 * hand-rolled custom provider because Codex owns the OSS wire adapter (0.145.0 is deprecating the
 * raw `wire_api = "chat"` that local servers speak). `--local-provider` selects the wire adapter; an
 * unfingerprinted endpoint (`provider === null`) defaults to `ollama`, the common case.
 *
 * A REMOTE endpoint cannot reuse any of that: `--oss` selects a provider that owns an
 * ollama/lmstudio wire adapter, which does not describe a hosted gateway. So it gets its own
 * generated `[model_providers.openthrottle_remote]` table via `-c` overrides, carrying `base_url`,
 * `env_key` and `wire_api = "responses"` (the only value 0.145.0 still accepts — see
 * {@link REMOTE_WIRE_API}). The key travels as an env assignment codex resolves by name, never as
 * an argv token.
 *
 * ⚠️ Host caveat, verified 2026-08-29: on a machine with a stored ChatGPT login in `~/.codex`, that
 * auth SHADOWS the provider's `env_key` — the run authenticates through `codex_login::auth::manager`
 * instead of the supplied key. A consumer that needs a guaranteed gateway identity must run with a
 * dedicated `CODEX_HOME`. That is a consumer concern (this package never touches the filesystem or
 * the environment it spawns into), but it is the difference between a working run and one that
 * silently uses the wrong account.
 * @public
 */
export const codexDriver = defineDriver({
  binEnv: 'OPENTHROTTLE_CODEX_BIN',
  binary: 'codex',
  buildShellCommand: (config) => {
    const modelNorm = config.model?.trim() ?? '';
    const modelFlag =
      modelNorm !== '' && modelNorm !== 'auto'
        ? ` --model ${escapeShellArg(modelNorm)}`
        : '';

    let endpointFlags = '';
    let endpointPrefix = '';
    if (config.endpoint) {
      if (config.endpoint.kind === DRIVER_ENDPOINT_KINDS.remote) {
        endpointFlags = remoteProviderOverrides(config.endpoint);
        // The key travels as a leading env assignment, which is how codex
        // resolves `env_key` in the child — the same mechanism grok's local
        // path already uses for XAI_API_KEY. Note this is an env assignment in
        // a `shell: true` command STRING, so it is as visible as any other part
        // of that string; what it buys is that codex reads it by name from the
        // environment rather than it being a codex argv token.
        endpointPrefix = config.endpoint.apiKey
          ? formatShellEnvPrefix({
              [REMOTE_API_KEY_ENV]: config.endpoint.apiKey,
            })
          : '';
      } else {
        const localProvider = config.endpoint.provider ?? 'ollama';
        // JSON.stringify yields a valid double-quoted TOML string literal for the -c value.
        const baseUrlOverride = `model_providers.oss.base_url=${JSON.stringify(
          config.endpoint.baseUrl,
        )}`;
        endpointFlags = ` --oss --local-provider ${localProvider} -c ${escapeShellArg(
          baseUrlOverride,
        )}`;
      }
    }

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);

    return `${endpointPrefix}codex exec --sandbox workspace-write${endpointFlags}${modelFlag} "${safePrompt}"`;
  },
  capabilities,
  id: 'codex',
  install: {
    installerShell: 'sh',
    method: 'curl-shell',
    url: 'https://chatgpt.com/codex/install.sh',
  },
  label: 'codex',
  update: { argv: ['update'], method: 'command' },
  versionArgs: ['--version'],
});
