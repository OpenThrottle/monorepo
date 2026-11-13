/**
 * @description Google Antigravity CLI driver: headless print mode
 * (`agy -p "<prompt>" --dangerously-skip-permissions`). Verified against Antigravity CLI 1.1.21 (darwin_arm64, official release tarball,
 * SHA512-checked); full dossier in `docs/openthrottle/antigravity-stream-json-schema.md`.
 *
 * Headless contract:
 * - `-p` / `--print` / `--prompt` all run one prompt non-interactively. `--prompt` is a documented
 *   live alias for `--print`, so `-p` is correct and stable.
 * - `--dangerously-skip-permissions` is the non-interactive approval flag. Without it an agentic
 *   run blocks on tool-permission prompts.
 * - `--output-format text|json|stream-json` for structured output. This driver's shell path leaves the default (`text`) alone: the shell command feeds
 *   unattended plan runs whose output is logged verbatim, and the chat/streaming path builds its own
 *   argv in `openthrottle-agentic-utils` where `stream-json` belongs.
 * - `--model` selects the model; `agy models` lists them. Other notable flags:
 *   `--json-schema`, id-based `--conversation` resume, `--effort`, `--sandbox`, and the
 *   load-bearing `--add-dir`.
 *
 * Two spawn gotchas verified against 1.1.21:
 * - UNAUTHENTICATED HEADLESS RUNS BLOCK — they do not fail fast. `agy -p "…" < /dev/null` prints a
 *   Google OAuth consent URL and then waits for a pasted authorization code even in print mode with
 *   stdin closed, before failing with `authentication failed or timed out`. It does not fail fast; it
 *   stalls for the auth window instead, so an unattended run MUST be bounded by
 *   `DriverInvocationConfig.timeoutMs` (the engine's timeout) or the CLI's own `--print-timeout`
 *   (default 5m). `< /dev/null` is still emitted: it makes the failure deterministic rather than
 *   leaving the child waiting on an inherited stdin.
 * - Credentials must be pre-provisioned on the host. Candidate env vars found in the binary are
 *   `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` and `AGY_ADC_AUTH`; which
 *   one actually satisfies headless auth is UNVERIFIED (see the dossier's residual-gap section).
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities, DriverModelListing } from '../types/index.ts';
import { structuredOutputShellFlag } from '../utils/output-format.ts';
import {
  escapeForShellDoubleQuoted,
  escapeShellArg,
  formatModelFlag,
} from '../utils/shell.ts';

const capabilities: DriverCapabilities = {
  /**
   * Antigravity resolves MCP servers from its OWN config scope, not from the workspace's committed
   * files. It keeps its config under `~/.gemini` —
   * servers live in `~/.gemini/config/mcp_config.json`.
   * The 1.1.21 binary shows no `.mcp.json` handling, so an OT checkout's committed `.mcp.json`
   * cannot reach `openthrottle-mcp`. Since 1.5.x agy also loads plugins from the workspace's
   * `.agents/plugins/`, and the OT monorepo generates one with its default servers (verified live,
   * 1.5.8). That is a property of a checkout that ships such a plugin, not of agy, so this stays
   * `false`: surface it as "cannot be verified", not as "server missing".
   */
  attachesWorkspaceMcp: false,
  /**
   * Wired to `antigravityConversationBackend` in `openthrottle-agentic-utils`
   * (conversation-backend/antigravity) — prompt in argv as the `-p` value, NDJSON stream-json mapper
   * over the verified `init`/`step_update`/`result` events, and real id-based multi-turn resume via
   * `--conversation` (rather than a flattened history). A guard test keeps this in lockstep with
   * `CONVERSATION_CLI_BACKENDS`.
   */
  chatStreaming: true,
  /**
   * Emits no MCP flags. Antigravity does have a programmatic surface — an `mcp`
   * subcommand (`add`, `remove`, `list`, `enable`, `disable`) — but that mutates host config as a
   * separate side-effecting step, which is not what `buildShellCommand` does: this builder is pure
   * and emits per-invocation flags only. No per-invocation MCP flag exists, so nothing is emitted.
   */
  mcpAutoApprove: false,
  /**
   * `--dangerously-skip-permissions` is emitted unconditionally (see the module JSDoc). Antigravity
   * also has `--mode accept-edits|plan`, a narrower knob we deliberately do not emit: unattended
   * runs need full auto-approval, and `plan` mode would suppress edits entirely.
   */
  permissionMode: true,
  /** Plugins install into Antigravity's own config scope; there is no out-of-repo plugin-dir flag. */
  pluginDir: false,
  reportsToolCalls: true,
  skipWorktreeSetup: false,
  /**
   * Speaks Google's own backend, not an OpenAI-compatible protocol, and exposes no base-URL flag —
   * local endpoints are not targetable.
   */
  supportsCustomBaseUrl: false,
  supportsModelFlag: true,
  worktree: false,
  worktreeBase: false,
};

/**
 * `agy models` lists models. Verified against an authenticated 1.1.21: it
 * prints a `Fetching available models...` progress line, then one TAB-SEPARATED row per model —
 * `<id>\t<Display Name>` (e.g. `gemini-3.1-pro-high\tGemini 3.1 Pro (High)`). So `parse` takes the
 * first tab-delimited field of each row and keeps it only if it looks like a bare model id; the
 * progress line has no tab and is dropped, as is the unauthenticated `Error: Please sign in…` line.
 * Tolerant per the `DriverModelListing` contract — returns `[]` rather than guessing.
 */
const discoverModels: DriverModelListing = {
  argv: ['models'],
  mode: 'command',
  parse: (stdout) =>
    stdout
      .split('\n')
      .filter((line) => line.includes('\t'))
      .map((line) => (line.split('\t')[0] ?? '').trim())
      .filter((id) => /^[a-z0-9][a-z0-9.@/-]*$/i.test(id)),
};

/**
 * @description Antigravity CLI driver (`agy`, label `antigravity`). Installed by Google's official
 * curl-shell installer, which drops a single self-updating Go binary at `~/.local/bin/agy` — there
 * is no npm or Homebrew distribution. Note the artifact inside the release tarball is named
 * `antigravity`, but the installed binary (what we spawn) is `agy`. Updates run the CLI's own
 * `update` subcommand; it also self-updates in the background during normal runs.
 * @public
 */
export const antigravityDriver = defineDriver({
  binEnv: 'OPENTHROTTLE_ANTIGRAVITY_BIN',
  binary: 'agy',
  buildShellCommand: (config) => {
    const modelFlag = formatModelFlag(config.model);

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);

    // Flag order is load-bearing and verified against 1.1.21:
    // - The prompt MUST immediately follow `-p`, which takes it as its VALUE. Putting a flag between
    //   them makes the CLI consume the flag as the prompt and exit 2 ("-p took
    //   \"--dangerously-skip-permissions\" as its prompt").
    // - `--add-dir "$PWD"` is what makes agy operate on the working tree. Without it the CLI reports
    //   "you do not have an active workspace set" and writes into an invented scratch project under
    //   `~/.gemini/antigravity-cli/scratch/<name>/` instead of the run's cwd — silent, and wrong for
    //   a plan run. `$PWD` is expanded by the shell (`shell: true`) so this stays a pure builder that
    //   needs no absolute path; a relative `--add-dir .` is NOT honored.
    // - `< /dev/null` keeps an unauthenticated run from sitting on an inherited stdin waiting for a
    //   pasted OAuth code; it bounds the failure but does NOT make it instant (see the module JSDoc).
    const outputFlag = structuredOutputShellFlag(
      config,
      '--output-format stream-json',
    );

    return `${escapeShellArg(config.bin ?? 'agy')} -p "${safePrompt}"${outputFlag} --dangerously-skip-permissions --add-dir "$PWD"${modelFlag} < /dev/null`;
  },
  capabilities,
  discoverModels,
  id: 'antigravity',
  install: {
    installerShell: 'bash',
    method: 'curl-shell',
    url: 'https://antigravity.google/cli/install.sh',
  },
  label: 'antigravity',
  update: { argv: ['update'], method: 'command' },
  versionArgs: ['--version'],
});
