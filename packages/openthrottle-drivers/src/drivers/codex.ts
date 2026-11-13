/**
 * @description OpenAI Codex CLI driver: non-interactive mode (`codex exec …`). Verified against the
 * installed CLI (codex-cli 0.145.0, `codex exec --help`): `codex exec [OPTIONS] [PROMPT]` runs
 * autonomously, `-m/--model` selects the model, and `-s/--sandbox` selects the filesystem policy.
 * We pass `--sandbox workspace-write` so the agent can edit the workspace without approval prompts
 * (the headless analog of Claude's `--permission-mode acceptEdits`), and `--skip-git-repo-check`
 * as the chat backend does: without it a run whose cwd is not a trusted git repo exits 1 ("Not
 * inside a trusted directory"), which the orchestrator reads as "no marker" and spends every
 * iteration on. Codex exec exposes no agent-worktree flags.
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities } from '../types/index.ts';
import { structuredOutputShellFlag } from '../utils/output-format.ts';
import { codexReasoningEffort } from '../utils/reasoning-effort.ts';
import {
  escapeForShellDoubleQuoted,
  escapeShellArg,
  formatModelFlag,
} from '../utils/shell.ts';

const capabilities: DriverCapabilities = {
  /**
   * Stays `false`: no workspace file is guaranteed to reach a codex run. Since codex-cli 0.167.0
   * (verified 2026-11-12) Codex does load a project `.codex/config.toml` (`[mcp_servers.*]`,
   * `approval_policy`, `sandbox_mode`, `commit_attribution`) and `.codex/rules/*.rules`, but ONLY when
   * the project is trusted (`[projects."<path>"] trust_level = "trusted"` in the user-scope
   * `~/.codex/config.toml`). Trust is host state, so reachability is still a property of the host,
   * not the checkout. An untrusted checkout skips the project `.codex/` layer entirely.
   */
  attachesWorkspaceMcp: false,
  chatStreaming: true,
  /**
   * No auto-approve flag exists. Codex resolves MCP servers from `[mcp_servers.*]` tables in the
   * USER-scope `~/.codex/config.toml` and, since codex-cli 0.167.0 (verified 2026-11-12), from a
   * TRUSTED project's `.codex/config.toml` — which this repo generates from
   * `.agents/agent-config.json`. `codex mcp add` still writes only the user file and exposes no
   * scope option, and the repo's `.mcp.json` / `.cursor/mcp.json` are never read. (The earlier
   * "no project-level config at all" note was measured on 0.147.0.)
   *
   * Consequence: whether codex can reach `openthrottle-mcp` is a property of the HOST (registered
   * in the user `config.toml`, or this project marked trusted), not of this command string. On a
   * host with neither, a codex run has no OT tools and an MCP-dependent scheduled job cannot
   * succeed — see plan a08e7d24 for the run-outcome signal that makes such a run stop reporting as
   * a clean success.
   *
   * A `-c mcp_servers.openthrottle-mcp.command=…` override could inject it from here, but that
   * would hardcode OT-specific server wiring into a leaf driver package whose whole point is to
   * stay workspace-agnostic. Deliberately not done.
   */
  mcpAutoApprove: false,
  permissionMode: true,
  pluginDir: false,
  reportsToolCalls: true,
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
    const modelFlag = formatModelFlag(config.model);

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

    // `-c model_reasoning_effort=<value>` overrides the config-file default for this run only.
    const effort = codexReasoningEffort(config.effort);
    const effortFlag =
      effort !== undefined ? ` -c model_reasoning_effort=${effort}` : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);

    const outputFlag = structuredOutputShellFlag(config, '--json');

    return `${escapeShellArg(config.bin ?? 'codex')} exec${outputFlag} --sandbox workspace-write --skip-git-repo-check${endpointFlags}${effortFlag}${modelFlag} "${safePrompt}"`;
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
