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
  chatStreaming: true,
  /**
   * No flag needed — verified against opencode 1.18.16. OpenCode reads the repo's committed
   * `opencode.json` `mcp` block automatically, including in headless `run` mode, with no approval
   * step: `opencode run --auto "…"` in a first-seen worktree reports both `openthrottle-mcp` and
   * `maestro` as available, and `opencode mcp list` shows them connected.
   *
   * Note the interaction with the endpoint path above: pointing `OPENCODE_CONFIG` at a materialized
   * provider-config file REPLACES the config opencode loads, so a local-endpoint run only keeps the
   * MCP servers if that generated file also carries the `mcp` block. Out of scope here; relevant if
   * local-endpoint runs are ever expected to use MCP tools.
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
 * non-blocking; `--model` is omitted when unset or `auto` (OpenCode has no `auto` alias). A local
 * endpoint is targeted by defining a custom `@ai-sdk/openai-compatible` provider in a config file
 * (materialized by the consumer) and pointing `OPENCODE_CONFIG` at it; `config.model` then carries
 * the `provider/model` id for that provider. The builder stays pure — it only references the
 * caller-supplied `endpoint.configFilePath`; the env prefix is baked in because the engine spawns
 * without an `env` override.
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
