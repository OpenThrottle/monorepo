/**
 * @description Common typings for the OpenThrottle agent-CLI driver contract. Every agent CLI
 * (Claude Code, Codex, Cursor, Gemini, Grok, OpenCode) is described by an {@link AgentDriver} and invoked
 * with a {@link DriverInvocationConfig}. Decoupled from Ralph/workflow types on purpose so this
 * package stays a leaf dependency.
 */

/**
 * @description One chunk of subprocess output when a driver is run through the async engine.
 * @public
 */
export interface DriverChunk {
  readonly data: string;
  readonly stream: 'stderr' | 'stdout';
}

/**
 * @description Optional worktree flags for a single driver invocation. Only drivers whose
 * {@link DriverCapabilities} advertise the corresponding flag act on these; the rest ignore them.
 * `worktree: ''` requests the flag with no name (`-w` / `--worktree` as a bare flag).
 * @public
 */
export interface DriverWorktreeOptions {
  /** Cursor-only: `--skip-worktree-setup`. */
  readonly skipWorktreeSetup?: boolean;
  /** Worktree name; `''` (see {@link WORKTREE_FLAG_ONLY}) passes the flag with no name. */
  readonly worktree?: string;
  /** Cursor-only: branch/ref for `--worktree-base`. */
  readonly worktreeBase?: string;
}

/**
 * @description Endpoint kinds a {@link DriverEndpointConfig} can describe.
 *
 * `local` is a server found by `discoverLocalModels` on this machine; `remote` is an authenticated
 * hosted gateway (OpenRouter). The distinction is NOT cosmetic — it selects a different command
 * shape per driver, because the built-in local-provider paths (codex's `--oss`, which owns its own
 * ollama/lmstudio wire adapter) cannot describe a gateway at all.
 * @public
 */
export const DRIVER_ENDPOINT_KINDS = {
  local: `local`,
  remote: `remote`,
} as const;

/** @public */
export type DriverEndpointKind =
  (typeof DRIVER_ENDPOINT_KINDS)[keyof typeof DRIVER_ENDPOINT_KINDS];

/**
 * @description Points a driver at an OpenAI-compatible endpoint other than the driver's own cloud
 * provider: either a discovered LOCAL model server (from `discoverLocalModels`) or an authenticated
 * REMOTE gateway (OpenRouter). Only drivers whose {@link DriverCapabilities} advertise
 * `supportsCustomBaseUrl` act on this; the rest ignore it. The mechanism differs per driver (env
 * prefix, CLI flag, or config file — see each driver module), but `baseUrl`/`provider` are the
 * shared inputs. `configFilePath` is materialized by the (impure) consumer for drivers that require
 * a provider-config file (opencode); the leaf-package command builders stay pure and only reference
 * the path.
 *
 * `kind` defaults to `local` when omitted, so every existing caller keeps its exact behavior.
 * @public
 */
export interface DriverEndpointConfig {
  /**
   * API key sent to the endpoint. Most local servers ignore it, but CLIs/SDKs often require *some*
   * value; drivers default to a placeholder when omitted. For a `remote` endpoint it is the
   * gateway credential and is REQUIRED — how it reaches the subprocess is per-driver (an env var
   * the CLI reads by name, or a consumer-materialized config file), never a command-line argument.
   */
  readonly apiKey?: string;
  /**
   * OpenAI-compatible base URL, e.g. `http://localhost:11434/v1` or
   * `https://openrouter.ai/api/v1`. Passed verbatim.
   */
  readonly baseUrl: string;
  /** Path to a caller-materialized provider-config file (opencode-only); ignored by other drivers. */
  readonly configFilePath?: string;
  /**
   * Which kind of endpoint this describes. Omitted ⇒ {@link DRIVER_ENDPOINT_KINDS.local}, so the
   * existing local callers are unchanged.
   */
  readonly kind?: DriverEndpointKind;
  /**
   * For a local endpoint, the discovery provider fingerprint (`null` when the server could not be
   * fingerprinted). For a remote endpoint, the gateway id (`openrouter`).
   */
  readonly provider?: 'lmstudio' | 'ollama' | 'openrouter' | null;
}

/**
 * @description Per-invocation inputs shared by every driver. Modeled on the legacy
 * `RunIterationConfig` but with no Ralph-specific coupling.
 * @public
 */
export interface DriverInvocationConfig {
  /** Process cwd for the subprocess; inherits `process.cwd()` when omitted. */
  readonly cwd?: string;
  /**
   * Optional local model-server endpoint to target; honored only by drivers advertising
   * `supportsCustomBaseUrl` (see {@link DriverEndpointConfig}). Others ignore it.
   */
  readonly endpoint?: DriverEndpointConfig;
  /** Iteration number (used only for log attribution). */
  readonly iteration: number;
  /** Model preset; drivers that advertise `supportsModelFlag` emit `--model` (Claude omits `auto`). */
  readonly model?: string;
  /** Per-chunk stdout/stderr callback (async path only). */
  readonly onChunk?: (chunk: DriverChunk) => void;
  /**
   * Out-of-repo plugin directories to load for this invocation; honored only by drivers advertising
   * `pluginDir`. Already fully resolved by the caller — existence-checked, container-path-mapped,
   * and gated by the operator's kill switch — because this package never touches the filesystem.
   * Omitted or empty means no flag, so a failed resolution degrades to a normal run.
   */
  readonly pluginDirs?: readonly string[];
  /** Full prompt passed to the CLI's print/headless mode. */
  readonly prompt: string;
  /** AbortSignal to cancel the invocation (async path only). */
  readonly signal?: AbortSignal;
  /** Per-invocation timeout in ms (async path only); on expiry the child is SIGTERM→SIGKILL'd. */
  readonly timeoutMs?: number;
  /** Optional worktree flags; honored per {@link DriverCapabilities}. */
  readonly worktree?: DriverWorktreeOptions;
}

/**
 * @description Feature flags a driver advertises so callers can feature-detect instead of
 * special-casing per id. Kept as a plain readonly interface (no enums).
 * @public
 */
export interface DriverCapabilities {
  /**
   * The CLI resolves the WORKSPACE's committed MCP config (`.mcp.json`, `.cursor/mcp.json`,
   * `opencode.json`), so a run in an OpenThrottle checkout can reach `openthrottle-mcp`.
   *
   * Deliberately distinct from {@link DriverCapabilities.mcpAutoApprove}, which only says whether
   * this driver EMITS flags. The two are independent, and conflating them warns on the wrong
   * drivers: claude, grok, and opencode emit nothing yet attach fine, while codex and gemini also
   * emit nothing and cannot attach at all. Consumers deciding whether an MCP-dependent prompt is viable
   * must read THIS flag.
   *
   * `false` does not mean the CLI lacks MCP support — codex and gemini both have it, but resolve
   * servers from their own config scope rather than from the repo's committed files. For those, reachability is a
   * property of the HOST, so OT cannot verify it from the workspace; surface that as "cannot be
   * verified", never as a flat claim that the server is missing.
   */
  readonly attachesWorkspaceMcp: boolean;
  /**
   * Has a wired streaming chat backend (a `ConversationBackend` adapter), so it can be offered as a
   * chat composer backend. `false` for plan-run-only drivers whose headless command works but that
   * have no streaming adapter yet. The plan-run/driver path uses every driver regardless; only this
   * gates the chat composer. Must stay in lockstep with the adapter registry
   * (`CONVERSATION_CLI_BACKENDS` in `@openthrottle/openthrottle-agentic-utils`) — a guard test
   * asserts the two agree.
   */
  readonly chatStreaming: boolean;
  /**
   * The CLI needs explicit flags to attach the workspace's configured MCP servers in headless
   * mode, and this driver emits them (Cursor: `--approve-mcps --trust`). `false` means the driver
   * emits no MCP flags — either because the CLI attaches MCP automatically in headless mode, or
   * because it has no MCP support at all. Which case applies, and the CLI version it was verified
   * against, is recorded in each driver module's JSDoc.
   *
   * Gates {@link appendMcpShellFlags}. Deliberately NOT caller-settable: the only consumers of
   * `buildShellCommand` are unattended surfaces (scheduled jobs, Ralph) where auto-approving a
   * known checkout's servers is the intent. The chat composer builds its own argv and has a
   * separate, narrower MCP posture — it is unaffected by this capability.
   */
  readonly mcpAutoApprove: boolean;
  /** Emits a permission-mode flag (Claude: `--permission-mode acceptEdits`). */
  readonly permissionMode: boolean;
  /**
   * Can be pointed at an out-of-repo plugin directory via
   * {@link DriverInvocationConfig.pluginDirs} (Claude: repeatable `--plugin-dir <path>`). This is
   * what lets an orchestrated run in a foreign checkout carry OT's hooks without writing anything
   * into that checkout — the asymmetry with skills, which no CLI can load from outside the working
   * tree. `false` for CLIs with no out-of-repo plugin surface; see the capability matrix in
   * `docs/monorepo/child-repo-hook-overlay.md`.
   *
   * Gates {@link appendPluginDirShellFlags}.
   */
  readonly pluginDir: boolean;
  /** Emits `--skip-worktree-setup` (Cursor-only today). */
  readonly skipWorktreeSetup: boolean;
  /**
   * Can be pointed at a custom OpenAI-compatible base URL (a discovered local endpoint) via
   * {@link DriverInvocationConfig.endpoint}. `false` for drivers that only speak their own cloud
   * provider's wire protocol (Claude → Anthropic Messages API; Cursor → its proprietary backend).
   */
  readonly supportsCustomBaseUrl: boolean;
  /** Emits a `--model` flag. */
  readonly supportsModelFlag: boolean;
  /** Emits a `-w` / `--worktree` flag. */
  readonly worktree: boolean;
  /** Emits `--worktree-base` (Cursor-only today). */
  readonly worktreeBase: boolean;
}

/**
 * @description How a driver's CLI enumerates the models it can run. `mode: 'command'` spawns the
 * binary with `argv` and maps stdout to model ids via the pure `parse` function (tolerant — returns
 * `[]` on unrecognized output); `mode: 'static'` carries a known list with no spawn. Kept dep-free
 * so `openthrottle-drivers` stays a leaf package; the spawning side-effect lives in the discovery
 * consumer (agentic-utils), which only calls `argv`/`parse`.
 * @public
 */
export type DriverModelListing =
  | {
      readonly argv: readonly string[];
      readonly mode: 'command';
      readonly parse: (stdout: string) => readonly string[];
    }
  | { readonly mode: 'static'; readonly models: readonly string[] };

/**
 * @description How a driver's CLI is installed on the host. `method: 'curl-shell'` fetches `url` and
 * pipes it to `installerShell` (`curl -fsSL <url> | <installerShell>`) — the vendor's official
 * installer; `method: 'npm'` installs `packageName` globally
 * (`npm install --global <packageName>`) for CLIs that ship no official curl-shell installer
 * (gemini — geminicli.com serves no install script, verified 2026-08-25). Kept as a pure
 * descriptor — the leaf package never spawns; the impure executor (agentic-utils) reads this and is
 * the only place a subprocess runs.
 * @public
 */
export type DriverInstallDescriptor =
  | {
      readonly installerShell: 'bash' | 'sh';
      readonly method: 'curl-shell';
      readonly url: string;
    }
  | { readonly method: 'npm'; readonly packageName: string };

/**
 * @description How a driver's CLI updates itself. `method: 'command'` runs the CLI's own self-update
 * subcommand (`<binary> <argv...>`, e.g. `claude update`, `opencode upgrade`); `method: 'reinstall'`
 * re-runs the install descriptor, whatever its method (idempotent latest-version installers). Pure
 * descriptor only.
 * @public
 */
export type DriverUpdateDescriptor =
  | { readonly argv: readonly string[]; readonly method: 'command' }
  | { readonly method: 'reinstall' };

/**
 * @description A single agent CLI, described once. Contributed via `defineDriver` and looked up
 * through the registry. `buildShellCommand` returns a `shell: true` command string and may throw
 * `UnsupportedDriverModeError` when the CLI has no viable headless mode.
 * @public
 */
export interface AgentDriver {
  /** Env var holding an absolute path override for {@link binary}, when set. */
  readonly binEnv?: string;
  /** Binary name resolved off PATH unless {@link binEnv} overrides it (e.g. `cursor-agent`). */
  readonly binary: string;
  readonly buildShellCommand: (config: DriverInvocationConfig) => string;
  readonly capabilities: DriverCapabilities;
  /** How discovery enumerates this CLI's models; omitted ⇒ availability-only (`models: []`). */
  readonly discoverModels?: DriverModelListing;
  /** Stable driver id (also a `DriverId`). */
  readonly id: string;
  /**
   * How this CLI is installed on the host (the registry is the single source of truth).
   * Omitted ⇒ not installable through the in-stack setup feature.
   */
  readonly install?: DriverInstallDescriptor;
  /** Human/iteration label, e.g. `claude-code`, `cursor-agent`. */
  readonly label: string;
  /**
   * How this CLI updates itself. Omitted ⇒ falls back to re-running {@link install} (when present).
   */
  readonly update?: DriverUpdateDescriptor;
  /** Args probing presence + version; default `['--version']`. */
  readonly versionArgs: readonly string[];
}
