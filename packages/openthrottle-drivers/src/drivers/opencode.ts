/**
 * @description OpenCode CLI driver: headless mode (`opencode run "<prompt>"`). Closes the backend
 * that previously threw `Unsupported execution backend`. Verified against the installed CLI
 * (opencode 1.18.5, `opencode run --help`): the prompt is a positional message, `-m/--model` takes
 * `provider/model`, and `--auto` auto-approves permissions (the headless analog of Claude's
 * `--permission-mode acceptEdits` / Cursor's `--force`). OpenCode exposes NO agent-worktree flags.
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities, DriverModelListing } from '../types/index.ts';
import {
  escapeForShellDoubleQuoted,
  escapeShellArg,
  formatShellEnvPrefix,
} from '../utils/shell.ts';

const capabilities: DriverCapabilities = {
  /** Reads the repo's committed `opencode.json` `mcp` block automatically in `run` mode (1.18.16). */
  attachesWorkspaceMcp: true,
  chatStreaming: true,
  /**
   * No flag needed — verified against opencode 1.18.16. OpenCode reads the repo's committed
   * `opencode.json` `mcp` block automatically, including in headless `run` mode, with no approval
   * step: `opencode run --auto "…"` in a first-seen worktree reports both `openthrottle-mcp` and
   * `maestro` as available, and `opencode mcp list` shows them connected.
   *
   * A previously-documented trap here — that pointing `OPENCODE_CONFIG` at a materialized
   * provider-config file REPLACES the loaded config and so drops the repo's `mcp` block — does NOT
   * reproduce on 1.18.16 and has been removed rather than worked around. Verified 2026-08-29 in an
   * OpenThrottle checkout: `opencode mcp list` returns the IDENTICAL 7 servers with and without
   * `OPENCODE_CONFIG` pointed at a generated provider file, `openthrottle-mcp` connected in both.
   * The generated file merges. Endpoint runs — local or remote — keep their MCP tools.
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
 * `opencode models` prints one `provider/model` id per line (verified against 1.18.5). Every
 * non-empty trimmed line is a model id.
 */
const discoverModels: DriverModelListing = {
  argv: ['models'],
  mode: 'command',
  parse: (stdout) =>
    stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== ''),
};

/**
 * @description OpenCode driver (`opencode`, label `opencode`). `--auto` keeps the agentic loop
 * non-blocking; `--model` is omitted when unset or `auto` (OpenCode has no `auto` alias). An
 * endpoint is targeted by pointing `OPENCODE_CONFIG` at a config file the consumer materializes;
 * `config.model` then carries the `provider/model` id for whatever provider that file defines. The
 * builder stays pure — it only references the caller-supplied `endpoint.configFilePath`; the env
 * prefix is baked in because the engine spawns without an `env` override.
 *
 * The same mechanism covers both endpoint kinds, which is why {@link DRIVER_ENDPOINT_KINDS} needs
 * no branch here — only the file's CONTENTS differ:
 *
 * - **local** — a custom `@ai-sdk/openai-compatible` provider pointed at the discovered `baseUrl`.
 * - **remote (OpenRouter)** — OpenCode ships a NATIVE `openrouter` provider, so the file only has
 *   to supply the key: `{"provider":{"openrouter":{"options":{"apiKey":"…"}}}}`. Models are then
 *   addressed as `openrouter/<vendor>/<slug>`. Verified 2026-08-29 against opencode 1.18.16:
 *   `opencode models` went from 0 to 354 `openrouter/*` entries with that file, and
 *   `opencode run --auto … --model openrouter/anthropic/claude-fable-5` reached the gateway
 *   (rejected only on the deliberately-invalid key).
 * @public
 */
export const opencodeDriver = defineDriver({
  binEnv: 'OPENTHROTTLE_OPENCODE_BIN',
  binary: 'opencode',
  buildShellCommand: (config) => {
    const modelNorm = config.model?.trim() ?? '';
    const modelFlag =
      modelNorm !== '' && modelNorm !== 'auto'
        ? ` --model ${escapeShellArg(modelNorm)}`
        : '';

    const configPath = config.endpoint?.configFilePath?.trim();
    const endpointPrefix = configPath
      ? formatShellEnvPrefix({ OPENCODE_CONFIG: configPath })
      : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);

    return `${endpointPrefix}opencode run --auto "${safePrompt}"${modelFlag}`;
  },
  capabilities,
  discoverModels,
  id: 'opencode',
  install: {
    installerShell: 'bash',
    method: 'curl-shell',
    url: 'https://opencode.ai/install',
  },
  label: 'opencode',
  update: { argv: ['upgrade'], method: 'command' },
  versionArgs: ['--version'],
});
