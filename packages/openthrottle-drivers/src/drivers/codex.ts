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
  chatStreaming: true,
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
  label: 'codex',
  versionArgs: ['--version'],
});
