/**
 * @description OpenAI Codex CLI driver: non-interactive mode (`codex exec …`). Verified against the
 * installed CLI (codex-cli 0.145.0, `codex exec --help`): `codex exec [OPTIONS] [PROMPT]` runs
 * autonomously, `-m/--model` selects the model, and `-s/--sandbox` selects the filesystem policy.
 * We pass `--sandbox workspace-write` so the agent can edit the workspace without approval prompts
 * (the headless analog of Claude's `--permission-mode acceptEdits`). Codex exec exposes no
 * agent-worktree flags.
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities } from '../types/index.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';

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
 * A local endpoint is targeted through Codex's built-in OSS provider (`--oss`), redirected at the
 * discovered `baseUrl` via a `-c model_providers.oss.base_url` override — this is preferred over a
 * hand-rolled custom provider because Codex owns the OSS wire adapter (0.145.0 is deprecating the
 * raw `wire_api = "chat"` that local servers speak). `--local-provider` selects the wire adapter; an
 * unfingerprinted endpoint (`provider === null`) defaults to `ollama`, the common case.
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
    if (config.endpoint) {
      const localProvider = config.endpoint.provider ?? 'ollama';
      // JSON.stringify yields a valid double-quoted TOML string literal for the -c value.
      const baseUrlOverride = `model_providers.oss.base_url=${JSON.stringify(
        config.endpoint.baseUrl,
      )}`;
      endpointFlags = ` --oss --local-provider ${localProvider} -c ${escapeShellArg(
        baseUrlOverride,
      )}`;
    }

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);

    return `codex exec --sandbox workspace-write${endpointFlags}${modelFlag} "${safePrompt}"`;
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
