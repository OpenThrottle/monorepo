/**
 * @description Common typings for the OpenThrottle agent-CLI driver contract. Every agent CLI
 * (Claude Code, Codex, Cursor, Grok, OpenCode) is described by an {@link AgentDriver} and invoked
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
 * @description Per-invocation inputs shared by every driver. Modeled on the legacy
 * `RunIterationConfig` but with no Ralph-specific coupling.
 * @public
 */
export interface DriverInvocationConfig {
  /** Process cwd for the subprocess; inherits `process.cwd()` when omitted. */
  readonly cwd?: string;
  /** Iteration number (used only for log attribution). */
  readonly iteration: number;
  /** Model preset; drivers that advertise `supportsModelFlag` emit `--model` (Claude omits `auto`). */
  readonly model?: string;
  /** Per-chunk stdout/stderr callback (async path only). */
  readonly onChunk?: (chunk: DriverChunk) => void;
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
   * Has a wired streaming chat backend (a `ConversationBackend` adapter), so it can be offered as a
   * chat composer backend. `false` for plan-run-only drivers whose headless command works but that
   * have no streaming adapter yet. The plan-run/driver path uses every driver regardless; only this
   * gates the chat composer. Must stay in lockstep with the adapter registry
   * (`CONVERSATION_CLI_BACKENDS` in `@openthrottle/openthrottle-agentic-utils`) — a guard test
   * asserts the two agree.
   */
  readonly chatStreaming: boolean;
  /** Emits a permission-mode flag (Claude: `--permission-mode acceptEdits`). */
  readonly permissionMode: boolean;
  /** Emits `--skip-worktree-setup` (Cursor-only today). */
  readonly skipWorktreeSetup: boolean;
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
  /** Human/iteration label, e.g. `claude-code`, `cursor-agent`. */
  readonly label: string;
  /** Args probing presence + version; default `['--version']`. */
  readonly versionArgs: readonly string[];
}
