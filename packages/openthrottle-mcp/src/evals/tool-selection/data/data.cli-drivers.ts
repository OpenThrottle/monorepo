/**
 * @description Which agent CLIs the tool-selection suite can drive against the sandboxed MCP, and why the rest
 * cannot yet. A CLI is supported only when the sandbox can be attached so that it REPLACES any OpenThrottle
 * server the host has configured — otherwise the CLI could reach the real server and execute a tool.
 */

/**
 * @description The MCP server name the sandbox is attached under. It is the production name on purpose: the CLI
 * then injects tool names exactly as it would for the real server (`mcp__openthrottle-mcp__create_plan`), and a
 * same-named user-scope entry is overridden rather than attached alongside.
 */
export const SANDBOX_SERVER_NAME = 'openthrottle-mcp';

/**
 * @description CLIs whose sandbox attachment is isolating, with the env var their driver reads its binary from
 * (the wrapper that injects the sandbox is installed there) and the binary it falls back to.
 */
export const CLI_DRIVER_BINARIES = {
  claude: { binEnv: 'OPENTHROTTLE_CLAUDE_BIN', binary: 'claude' },
  codex: { binEnv: 'OPENTHROTTLE_CODEX_BIN', binary: 'codex' },
} as const;

/**
 * @description CLIs the suite refuses, with the reason. Each needs a way to attach the sandbox that provably
 * shadows a host-configured OpenThrottle server before it can be driven.
 */
export const UNSUPPORTED_CLI_DRIVERS: Readonly<Record<string, string>> = {
  antigravity: `reads MCP servers only from its own ~/.gemini config and has no per-invocation MCP flag, so the sandbox cannot be attached`,
  cursor: `merges the workspace .cursor/mcp.json with ~/.cursor/mcp.json and has no strict-config flag, so a host-configured OpenThrottle server could attach alongside the sandbox`,
  grok: `reads .mcp.json alongside its own TOML config with no strict-config flag, so a host-configured OpenThrottle server could attach alongside the sandbox`,
  opencode: `merges opencode.json with its global config with no strict-config flag, so a host-configured OpenThrottle server could attach alongside the sandbox`,
};

/**
 * @description Per-trial wall-clock limit for a CLI run, in ms.
 */
export const DEFAULT_CLI_TIMEOUT_MS = 300_000;

/**
 * @description The label a CLI run records as its model when `--model` is not given, so a baseline says it
 * measured whatever the CLI defaulted to.
 */
export const CLI_DEFAULT_MODEL_LABEL = 'cli-default';
