/**
 * @description Google Gemini CLI driver: headless one-shot mode via the positional prompt
 * (`gemini --approval-mode yolo "<prompt>"`). Verified against the installed CLI (gemini-cli
 * 0.25.2, `gemini --help`) and its shipped source — full dossier in
 * `docs/openthrottle/gemini-stream-json-schema.md`: a positional prompt defaults to one-shot
 * (`-p/--prompt` is DEPRECATED and slated for removal, so this driver never emits it),
 * `-m/--model` selects the model, and `--approval-mode yolo` is the non-interactive approval
 * flag (`default` prompts, `auto_edit` only covers edits — unattended runs need `yolo`).
 *
 * Two spawn gotchas verified against 0.25.2:
 * - When stdin is not a TTY the CLI `await`s reading stdin to EOF before running
 *   (`dist/src/gemini.js` `readStdin()`), and the engine spawns with `stdio: ['inherit', …]` —
 *   so the command redirects `< /dev/null` or a server-spawned run hangs forever.
 * - Headless auth comes from the environment (`GEMINI_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI`,
 *   `GOOGLE_GENAI_USE_GCA`) or a host-level `~/.gemini/settings.json`; with none it exits 41.
 */

import { defineDriver } from '../registry/index.ts';
import type { DriverCapabilities } from '../types/index.ts';
import { escapeForShellDoubleQuoted, escapeShellArg } from '../utils/shell.ts';

const capabilities: DriverCapabilities = {
  /**
   * Gemini resolves MCP servers ONLY from `mcpServers` in `.gemini/settings.json` (user scope
   * `~/.gemini/`, workspace scope `<cwd>/.gemini/`) — the 0.25.2 source contains zero references
   * to `.mcp.json`. OT checkouts commit `.mcp.json` but no `.gemini/settings.json`, so a run in an
   * OT checkout cannot reach `openthrottle-mcp`. Like codex, reachability is a property of the
   * host's own config, so surface it as "cannot be verified", not as "server missing".
   */
  attachesWorkspaceMcp: false,
  /**
   * Wired to `geminiConversationBackend` in `openthrottle-agentic-utils`
   * (conversation-backend/gemini) — stdin-piped prompt, NDJSON stream-json
   * mapper, flattened multi-turn history (no id-based resume in 0.25.2).
   */
  chatStreaming: true,
  /** No workspace MCP config to approve, so there is nothing to emit (see above). */
  mcpAutoApprove: false,
  permissionMode: true,
  /** Gemini extensions install into `~/.gemini`; there is no out-of-repo plugin-dir flag. */
  pluginDir: false,
  skipWorktreeSetup: false,
  /**
   * The Gemini CLI speaks the Gemini API (or Vertex), not an OpenAI-compatible protocol, and
   * exposes no base-URL flag — local endpoints are not targetable.
   */
  supportsCustomBaseUrl: false,
  supportsModelFlag: true,
  worktree: false,
  worktreeBase: false,
};

/**
 * @description Gemini CLI driver (`gemini`, label `gemini`). `--approval-mode yolo` keeps the
 * agentic loop non-blocking; `--model` is omitted when unset or `auto` (the CLI applies its own
 * default). No model-listing command exists in 0.25.2 (subcommands are only `mcp`, `extensions`,
 * `hooks`, `skills`), so discovery is availability-only. There is no official curl-shell
 * installer — install is npm-global and update re-runs it (no self-update subcommand either).
 * @public
 */
export const geminiDriver = defineDriver({
  binEnv: 'OPENTHROTTLE_GEMINI_BIN',
  binary: 'gemini',
  buildShellCommand: (config) => {
    const modelNorm = config.model?.trim() ?? '';
    const modelFlag =
      modelNorm !== '' && modelNorm !== 'auto'
        ? ` --model ${escapeShellArg(modelNorm)}`
        : '';

    const safePrompt = escapeForShellDoubleQuoted(config.prompt);

    // `< /dev/null` is load-bearing: with a non-TTY stdin the CLI blocks reading it to EOF.
    return `gemini --approval-mode yolo "${safePrompt}"${modelFlag} < /dev/null`;
  },
  capabilities,
  id: 'gemini',
  install: { method: 'npm', packageName: '@google/gemini-cli' },
  label: 'gemini',
  update: { method: 'reinstall' },
  versionArgs: ['--version'],
});
