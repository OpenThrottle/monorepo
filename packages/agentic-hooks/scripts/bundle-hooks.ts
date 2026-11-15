/**
 * Deterministic esbuild bundler and generator for the OpenThrottle hook plugins.
 *
 * Each adapter is a TS entrypoint under `src/adapters/<tool>/`. This script
 * bundles each one into a self-contained CommonJS `.cjs` under its payload's
 * `dist/`. The bundle `require`s nothing outside node builtins — the neutral
 * core is inlined — so hooks run as bare `node x.cjs` with no `node_modules`.
 *
 * Every payload under `plugins/` is one installable plugin for one tool
 * (telemetry, workflow, guards; a payload's hook config names its own tool's
 * events). A tool runs the fixed stub under `hooks/` or `bin/`, which requires
 * `dist/<file>` when it has been built and otherwise exits 0. The payloads are
 * the ONLY delivery: this repository installs its own plugins like any other
 * repository does, and OT-driven runs pass them as `--plugin-dir`. See
 * `docs/monorepo/hook-plugin-distribution.md`.
 *
 * Determinism (so the drift check is byte-stable): pinned esbuild (catalog),
 * `minify:false`, `charset:'utf8'`, no sourcemap, `legalComments:'none'`, and a
 * static banner with NO date/timestamp.
 *
 * Modes:
 *   (default) write committed bundles + set the exec bit.
 *   --check   regenerate in-memory and diff against the committed files; exit
 *             non-zero on any drift (used by `bundle-hooks-check` in check:local).
 */
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');

interface BundleSpec {
  /** Entry TS file, relative to the package `src/` folder. */
  readonly entry: string;
  /** Output `.cjs` file, relative to the workspace root. */
  readonly outFile: string;
}

/**
 * One distributable plugin payload: a committed directory a tool can be pointed
 * at with its own `--plugin-dir` flag, or that a human installs once from a
 * marketplace. Both delivery routes read the same directory.
 *
 * There is one payload PER TOOL rather than one shared payload, because the
 * only part that differs is the part that cannot be shared: a tool's hook
 * config names that tool's events. Cursor will happily read
 * `.claude-plugin/plugin.json` and `hooks/hooks.json` (its manifest lookup
 * tries `.cursor-plugin/`, then `.claude-plugin/`, then a bare `plugin.json`),
 * and it even translates Claude's event names — but the translation drops
 * exactly what we need: `PreToolUse` with `matcher: "Skill"` has no Cursor tool
 * to match, `UserPromptExpansion` has no Cursor equivalent at all, and `Stop`
 * maps to an event that never fires in a headless run. A shared payload would
 * therefore load, report no error, and record nothing.
 */
interface PluginPayloadBase {
  /** Adapter entrypoints shipped in this payload. */
  readonly bundles: readonly PluginEntry[];
  /**
   * Plugins this one requires, by name. Claude Code installs a missing declared
   * dependency along with the plugin; empty when there is none.
   */
  readonly dependencies: readonly string[];
  /** The manifest `description`, which a marketplace listing shows. */
  readonly description: string;
  /** Extra "turning it off" README rows beyond the tool-neutral one. */
  readonly disableRows: readonly (readonly [string, string])[];
  /** README table rows: [event, handler file]. */
  readonly hookTableRows: readonly (readonly [string, string])[];
  /** README lines for the install section, verbatim. */
  readonly installLines: readonly string[];
  /** Human label for this tool in prose. */
  readonly label: string;
  /** The manifest `name`, which is also the plugin id's first half. */
  readonly name: string;
  /**
   * The tool's own hook config object, built from a helper that resolves a
   * payload-relative handler to the command spelling that tool expands.
   */
  readonly renderHooks: ((command: (file: string) => string) => unknown) | null;
  /** Workspace-relative root of the committed payload directory. */
  readonly root: string;
  /** Env var expanded to the payload root in a hook command. */
  readonly rootVar: string;
}

/** The skill-usage telemetry plugin: observes, never blocks. */
interface TelemetryPayload extends PluginPayloadBase {
  /** Closing note explaining the capture wiring, or null when there is none. */
  readonly captureNote: string | null;
  /** README "Diagnosing" lines, verbatim; empty when the payload ships no doctor. */
  readonly diagnosingLines: readonly string[];
  /** Extra README "What it collects" paragraphs for hooks beyond capture/complete; empty when none. */
  readonly heartbeatCollects: readonly string[];
  readonly kind: 'telemetry';
}

/** A workflow or guards plugin: hooks that steer the agent, and may deny. */
interface ExtensionPayload extends PluginPayloadBase {
  /**
   * README "Can it block?" lines, verbatim. Stated per plugin because the
   * answer is the first thing someone installing a hook needs to know.
   */
  readonly blockingLines: readonly string[];
  readonly kind: 'extension';
  /** README paragraphs under the title, verbatim. */
  readonly summaryLines: readonly string[];
  /** README title. */
  readonly title: string;
}

type PluginPayload = ExtensionPayload | TelemetryPayload;

/**
 * One adapter entrypoint inside a payload.
 *
 * The real bundle lands in `<root>/dist/<file>`. What a tool runs is a tiny
 * committed stub at `<root>/hooks/<file>` (a hook handler) or `<root>/bin/<file>`
 * (an operator CLI; Claude Code puts a plugin's `bin/` on the Bash tool's PATH).
 * The stub depends only on the file name, so it never changes when the bundle
 * does, and it exits 0 when `dist/` has not been built — fail-open, and silent.
 */
interface PluginEntry {
  /** Entry TS file, relative to the package `src/` folder. */
  readonly entry: string;
  /** File name, shared by the stub and the `dist/` bundle. */
  readonly file: string;
  /** `hook` stubs go under `hooks/`, `bin` stubs under `bin/`. */
  readonly kind: 'bin' | 'hook';
}

/**
 * The Claude telemetry payload: three hook handlers plus three operator CLIs.
 *
 * `doctor`, `drain` and `outcome` are manual CLIs wired to no event, shipped
 * under `bin/` because each is useful wherever the plugin is installed: the
 * doctor diagnoses a machine where the plugin itself may be missing or stale
 * (and names the drain next to it as its fix), and skills report a deliberate
 * outcome through `skill-usage-outcome.cjs` on the Bash PATH. `backfill`,
 * `resegment` and `scope` are operator tools for an OpenThrottle checkout and
 * ship nowhere.
 */
const CLAUDE_PLUGIN_ENTRIES: readonly PluginEntry[] = [
  {
    entry: 'adapters/claude/capture.ts',
    file: 'skill-usage-capture.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/claude/complete.ts',
    file: 'skill-usage-complete.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/claude/doctor.ts',
    file: 'skill-usage-doctor.cjs',
    kind: 'bin',
  },
  {
    entry: 'adapters/claude/drain.ts',
    file: 'skill-usage-drain.cjs',
    kind: 'bin',
  },
  {
    entry: 'adapters/claude/heartbeat.ts',
    file: 'skill-usage-heartbeat.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/claude/outcome.ts',
    file: 'skill-usage-outcome.cjs',
    kind: 'bin',
  },
];

const CURSOR_PLUGIN_ENTRIES: readonly PluginEntry[] = [
  {
    entry: 'adapters/cursor/capture.ts',
    file: 'skill-usage-capture.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/cursor/complete.ts',
    file: 'skill-usage-complete.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/cursor/heartbeat.ts',
    file: 'skill-usage-heartbeat.cjs',
    kind: 'hook',
  },
];

/** OT plan-run workflow: steers an agent working an OT plan, never denies a tool call it cannot justify. */
const CLAUDE_WORKFLOW_ENTRIES: readonly PluginEntry[] = [
  {
    entry: 'adapters/claude/plan-auto-close.ts',
    file: 'plan-auto-close.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/claude/plan-inbox-claim.ts',
    file: 'plan-inbox-claim.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/claude/plan-run-janitor.ts',
    file: 'plan-run-janitor.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/claude/plan-run-task-guard.ts',
    file: 'plan-run-task-guard.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/claude/require-ot-plan-kickoff.ts',
    file: 'require-ot-plan-kickoff.cjs',
    kind: 'hook',
  },
];

/** General guards: useful with or without OpenThrottle. */
const CLAUDE_GUARDS_ENTRIES: readonly PluginEntry[] = [
  {
    entry: 'adapters/claude/bash-guard.ts',
    file: 'bash-guard.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/claude/memory-index-guard.ts',
    file: 'memory-index-guard.cjs',
    kind: 'hook',
  },
];

const CODEX_PLUGIN_ENTRIES: readonly PluginEntry[] = [
  {
    entry: 'adapters/codex/capture.ts',
    file: 'skill-usage-capture.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/codex/complete.ts',
    file: 'skill-usage-complete.cjs',
    kind: 'hook',
  },
  {
    entry: 'adapters/codex/heartbeat.ts',
    file: 'skill-usage-heartbeat.cjs',
    kind: 'hook',
  },
];

const CURSOR_GUARDS_ENTRIES: readonly PluginEntry[] = [
  {
    entry: 'adapters/cursor/bash-guard.ts',
    file: 'bash-guard.cjs',
    kind: 'hook',
  },
];

const TELEMETRY_DESCRIPTION = (label: string): string => {
  return `Records which agent skills run under ${label}, so OpenThrottle can report skill usage. Telemetry only — it never modifies your repository and never blocks a tool call.`;
};

const BASH_GUARD_SUMMARY: readonly string[] = [
  'Checks every shell command the agent is about to run against a registry of mistakes that',
  'fail in ways the agent cannot see: an unquoted zsh glob that aborts before the command runs,',
  'a `$var:x` zsh modifier, a BSD `sed -i` with no suffix, a pipeline or trailing `echo $?` that',
  'masks a failing exit status, and a `gh` write to a PR that is already merged or closed.',
];

/**
 * Every payload this script owns. Adding a tool is a row here plus its outputs
 * in BOTH `bundle-hooks` and `bundle-hooks-check` in `package.json`.
 *
 * A payload root is a REAL committed directory, not gitignored build output:
 * leg B points a running server's `--plugin-dir` at the path in place, so it
 * has to exist in a plain checkout with nothing built.
 */
const PLUGIN_PAYLOADS: readonly PluginPayload[] = [
  {
    bundles: CLAUDE_PLUGIN_ENTRIES,
    captureNote: [
      'The two capture events are complementary, not redundant: a skill invoked as a tool',
      'raises `PreToolUse`, a skill invoked as a slash command raises `UserPromptExpansion`.',
    ].join('\n'),
    dependencies: [],
    description: TELEMETRY_DESCRIPTION('Claude Code'),
    diagnosingLines: [
      'If skill usage is not showing up, run the doctor. It checks the plugin install, the',
      'endpoint and token, server reachability, the local buffer, the last heartbeat and the',
      'offline switch, then prints the exact fix for anything wrong. It is read-only unless you',
      'pass `--fix`, and never prints your token.',
      '',
      '```bash',
      '# from an OpenThrottle checkout',
      'pnpm run telemetry:doctor',
      '',
      '# inside a Claude Code session, the plugin puts it on the Bash PATH',
      'skill-usage-doctor.cjs',
      '',
      '# from any shell, using the installed plugin',
      'node ~/.claude/plugins/cache/openthrottle/openthrottle/<version>/bin/skill-usage-doctor.cjs',
      '```',
      '',
      'Add `--json` for machine-readable output, or `--strict` to exit 1 when any check fails.',
      '',
      'Add `--fix` to have it offer to install or update the plugin for you: it shows the exact',
      '`claude plugin …` commands and runs them only after you answer yes. It needs an interactive',
      'terminal and is ignored with `--json`.',
      '',
    ],
    disableRows: [['`/plugin uninstall openthrottle`', 'removes it entirely']],
    heartbeatCollects: [
      'Once per session start, a coverage heartbeat: a random machine id (generated once into',
      '`~/.openthrottle/machine-id`, never derived from your hostname), an optional machine label',
      'you set yourself with `OPENTHROTTLE_MACHINE_LABEL`, which way the hooks were delivered',
      '(`repo`, `plugin-dir` or `marketplace`), the normalized git remote of the repository',
      "(credentials stripped, no paths), this plugin's version, whether the marketplace plugin is",
      'installed, and counts of locally buffered records with the age of the oldest. It carries no',
      'email, hostname, username, path, token, skill name or argument. A heartbeat is never',
      'buffered; the last attempt is written to `~/.openthrottle/skill-usage/last-heartbeat.json`.',
      '',
    ],
    hookTableRows: [
      ['`PreToolUse` (matcher `Skill`)', '`hooks/skill-usage-capture.cjs`'],
      ['`UserPromptExpansion`', '`hooks/skill-usage-capture.cjs`'],
      ['`SessionStart`', '`hooks/skill-usage-heartbeat.cjs`'],
      ['`Stop`', '`hooks/skill-usage-complete.cjs`'],
    ],
    installLines: [
      '```bash',
      '/plugin marketplace add OpenThrottle/monorepo',
      '/plugin install openthrottle@openthrottle',
      '```',
    ],
    kind: 'telemetry',
    label: 'Claude Code',
    name: 'openthrottle',
    renderHooks: (command) => ({
      hooks: {
        PreToolUse: [
          {
            hooks: [
              {
                command: command('skill-usage-capture.cjs'),
                statusMessage: 'Skill usage capture (PreToolUse)',
                type: 'command',
              },
            ],
            matcher: 'Skill',
          },
        ],
        SessionStart: [
          {
            hooks: [
              {
                command: command('skill-usage-heartbeat.cjs'),
                statusMessage: 'Telemetry coverage heartbeat (SessionStart)',
                type: 'command',
              },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              {
                command: command('skill-usage-complete.cjs'),
                statusMessage: 'Skill usage complete (Stop)',
                type: 'command',
              },
            ],
          },
        ],
        UserPromptExpansion: [
          {
            hooks: [
              {
                command: command('skill-usage-capture.cjs'),
                statusMessage: 'Skill usage capture (UserPromptExpansion)',
                type: 'command',
              },
            ],
          },
        ],
      },
    }),
    root: 'plugins/openthrottle',
    rootVar: 'CLAUDE_PLUGIN_ROOT',
  },
  {
    bundles: CURSOR_PLUGIN_ENTRIES,
    captureNote: [
      "Cursor has no `Skill` tool: a skill invocation is a `Read` of the skill's `SKILL.md`,",
      'which is why capture listens on `preToolUse`. Completion listens on `sessionEnd`, not',
      '`stop` — `stop` is the per-turn event and does not fire in headless runs at all.',
    ].join('\n'),
    dependencies: [],
    description: TELEMETRY_DESCRIPTION('Cursor'),
    diagnosingLines: [],
    disableRows: [
      [
        '`cursor-agent plugin marketplace`',
        'manage or remove the installed plugin',
      ],
    ],
    heartbeatCollects: [
      'Once per session start, a coverage heartbeat: a random machine id (generated once into',
      '`~/.openthrottle/machine-id`, never derived from your hostname), an optional machine label',
      'you set yourself with `OPENTHROTTLE_MACHINE_LABEL`, which way the hooks were delivered',
      '(`repo` or `plugin-dir`), the normalized git remote of the repository (credentials',
      "stripped, no paths), this plugin's version, and counts of locally buffered records with the",
      "age of the oldest. Cursor's session payload carries your account email; the heartbeat reads",
      'only the working directory from it and sends no email, hostname, username, path, token,',
      'skill name or argument. A heartbeat is never buffered; the last attempt is written to',
      '`~/.openthrottle/skill-usage/last-heartbeat.json`.',
      '',
    ],
    hookTableRows: [
      ['`preToolUse`', '`hooks/skill-usage-capture.cjs`'],
      ['`beforeSubmitPrompt`', '`hooks/skill-usage-capture.cjs`'],
      ['`sessionStart`', '`hooks/skill-usage-heartbeat.cjs`'],
      ['`sessionEnd`', '`hooks/skill-usage-complete.cjs`'],
    ],
    installLines: [
      'Pass the payload directory directly:',
      '',
      '```bash',
      'cursor-agent --plugin-dir /path/to/plugins/openthrottle-cursor -p "…"',
      '```',
    ],
    kind: 'telemetry',
    label: 'Cursor',
    name: 'openthrottle',
    renderHooks: (command) => ({
      hooks: {
        beforeSubmitPrompt: [{ command: command('skill-usage-capture.cjs') }],
        preToolUse: [{ command: command('skill-usage-capture.cjs') }],
        sessionEnd: [{ command: command('skill-usage-complete.cjs') }],
        sessionStart: [{ command: command('skill-usage-heartbeat.cjs') }],
      },
      version: 1,
    }),
    root: 'plugins/openthrottle-cursor',
    rootVar: 'CURSOR_PLUGIN_ROOT',
  },
  {
    bundles: CODEX_PLUGIN_ENTRIES,
    captureNote: [
      "Codex reads hooks from `~/.codex/config.toml` (or a trusted project's `.codex/`), never",
      'from a plugin directory, so this payload ships no `hooks/hooks.json` and no driver passes',
      'it as `--plugin-dir`. Capture is slash-commands-only: Codex raises no tool event for a skill.',
    ].join('\n'),
    dependencies: [],
    description: TELEMETRY_DESCRIPTION('Codex'),
    diagnosingLines: [],
    disableRows: [['remove the `[[hooks.…]]` blocks', 'stops it entirely']],
    heartbeatCollects: [],
    hookTableRows: [
      ['`UserPromptSubmit`', '`hooks/skill-usage-capture.cjs`'],
      ['`SessionStart`', '`hooks/skill-usage-heartbeat.cjs`'],
      ['`SessionEnd`', '`hooks/skill-usage-complete.cjs`'],
    ],
    installLines: [
      'Add these to `~/.codex/config.toml` once, with the absolute path of this directory:',
      '',
      '```toml',
      '[[hooks.UserPromptSubmit]]',
      '[[hooks.UserPromptSubmit.hooks]]',
      'type = "command"',
      'command = "/absolute/path/to/plugins/openthrottle-codex/hooks/skill-usage-capture.cjs"',
      '',
      '[[hooks.SessionEnd]]',
      '[[hooks.SessionEnd.hooks]]',
      'type = "command"',
      'command = "/absolute/path/to/plugins/openthrottle-codex/hooks/skill-usage-complete.cjs"',
      '',
      '[[hooks.SessionStart]]',
      '[[hooks.SessionStart.hooks]]',
      'type = "command"',
      'command = "/absolute/path/to/plugins/openthrottle-codex/hooks/skill-usage-heartbeat.cjs"',
      '```',
    ],
    kind: 'telemetry',
    label: 'Codex',
    name: 'openthrottle',
    renderHooks: null,
    root: 'plugins/openthrottle-codex',
    rootVar: 'CODEX_HOME',
  },
  {
    blockingLines: [
      '`require-ot-plan-kickoff` **denies** a desktop-app session kickoff (`start_session`,',
      '`hand_off_to_session`) whose brief does not start with `/ot-loop <planUuid>`, so',
      'follow-up work lands in an OpenThrottle plan. Every other hook only adds context or',
      'settles bookkeeping, and every one of them allows when it fails or cannot reach OT.',
    ],
    bundles: CLAUDE_WORKFLOW_ENTRIES,
    dependencies: ['openthrottle'],
    description: `OpenThrottle plan-run workflow hooks for Claude Code: delivers plan inbox messages before destructive steps, warns on edits with no task in progress, reports plan auto-close, settles abandoned runs, and requires an OT plan for session kickoffs.`,
    disableRows: [
      ['`/plugin uninstall openthrottle-workflow`', 'removes it entirely'],
    ],
    hookTableRows: [
      [
        '`PreToolUse` (matcher `Bash|Agent|Task`)',
        '`hooks/plan-inbox-claim.cjs`',
      ],
      [
        '`PreToolUse` (matcher `Edit|Write|MultiEdit|NotebookEdit`)',
        '`hooks/plan-run-task-guard.cjs`',
      ],
      [
        '`PreToolUse` (session kickoff tools)',
        '`hooks/require-ot-plan-kickoff.cjs`',
      ],
      [
        '`PostToolUse` (matcher `mcp__.*__update_task`)',
        '`hooks/plan-auto-close.cjs`',
      ],
      ['`Stop`', '`hooks/plan-run-janitor.cjs`'],
    ],
    installLines: [
      '```bash',
      '/plugin marketplace add OpenThrottle/monorepo',
      '/plugin install openthrottle-workflow@openthrottle',
      '```',
      '',
      'It depends on `openthrottle` (telemetry), which installs with it.',
    ],
    kind: 'extension',
    label: 'Claude Code',
    name: 'openthrottle-workflow',
    renderHooks: (command) => ({
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                command: command('plan-auto-close.cjs'),
                statusMessage: 'Report plan auto-close (PostToolUse)',
                timeout: 10,
                type: 'command',
              },
            ],
            matcher: 'mcp__.*__update_task',
          },
        ],
        PreToolUse: [
          {
            hooks: [
              {
                command: command('require-ot-plan-kickoff.cjs'),
                statusMessage: `Require an OT plan for session kickoffs (PreToolUse)`,
                type: 'command',
              },
            ],
            matcher: `mcp__ccd_session__start_session|mcp__ccd_session__hand_off_to_session`,
          },
          {
            hooks: [
              {
                command: command('plan-run-task-guard.cjs'),
                statusMessage: 'Plan-run task guard (PreToolUse)',
                timeout: 10,
                type: 'command',
              },
            ],
            matcher: 'Edit|Write|MultiEdit|NotebookEdit',
          },
          {
            hooks: [
              {
                command: command('plan-inbox-claim.cjs'),
                statusMessage: 'Plan inbox claim (PreToolUse)',
                timeout: 10,
                type: 'command',
              },
            ],
            matcher: 'Bash|Agent|Task',
          },
        ],
        Stop: [
          {
            hooks: [
              {
                command: command('plan-run-janitor.cjs'),
                statusMessage: 'Settle abandoned plan runs (Stop)',
                type: 'command',
              },
            ],
          },
        ],
      },
    }),
    root: 'plugins/openthrottle-workflow',
    rootVar: 'CLAUDE_PLUGIN_ROOT',
    summaryLines: [
      'Keeps an agent working an OpenThrottle plan honest about its bookkeeping. During a plan',
      'run it claims the plan inbox before a subagent delegation or a destructive command, so a',
      "human's STEER lands before the step rather than after it; it warns when an edit is about",
      'to happen with no task `IN_PROGRESS`; it tells the agent when completing a task closed the',
      'plan; and on `Stop` it settles plan runs whose session is provably gone.',
      '',
      'Outside a plan run, and with no OpenThrottle server configured, every hook is a no-op.',
      'Plan-run notes live under `~/.openthrottle/`, never in your repository.',
    ],
    title: 'OpenThrottle workflow plugin (Claude Code)',
  },
  {
    blockingLines: [
      '`bash-guard` **denies** a small set of commands that cannot succeed (for example a `gh`',
      'write to a merged PR) and warns, without denying, on the rest. `memory-index-guard` only',
      'adds context. Both allow whenever they fail.',
    ],
    bundles: CLAUDE_GUARDS_ENTRIES,
    dependencies: [],
    description: `Guards for Claude Code: catches shell commands that fail invisibly (zsh globs and modifiers, BSD sed, masked exit status, gh writes to closed PRs) and warns before MEMORY.md outgrows the session index. Works with or without an OpenThrottle server.`,
    disableRows: [
      ['`/plugin uninstall openthrottle-guards`', 'removes it entirely'],
    ],
    hookTableRows: [
      ['`PreToolUse` (matcher `Bash`)', '`hooks/bash-guard.cjs`'],
      [
        '`PostToolUse` (matcher `Write|Edit|MultiEdit`)',
        '`hooks/memory-index-guard.cjs`',
      ],
    ],
    installLines: [
      '```bash',
      '/plugin marketplace add OpenThrottle/monorepo',
      '/plugin install openthrottle-guards@openthrottle',
      '```',
    ],
    kind: 'extension',
    label: 'Claude Code',
    name: 'openthrottle-guards',
    renderHooks: (command) => ({
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                command: command('memory-index-guard.cjs'),
                statusMessage: 'Memory index budget guard (PostToolUse)',
                type: 'command',
              },
            ],
            matcher: 'Write|Edit|MultiEdit',
          },
        ],
        PreToolUse: [
          {
            hooks: [
              {
                command: command('bash-guard.cjs'),
                statusMessage: 'Bash guard (PreToolUse)',
                timeout: 10,
                type: 'command',
              },
            ],
            matcher: 'Bash',
          },
        ],
      },
    }),
    root: 'plugins/openthrottle-guards',
    rootVar: 'CLAUDE_PLUGIN_ROOT',
    summaryLines: [
      ...BASH_GUARD_SUMMARY,
      '',
      'After any write, `memory-index-guard` names the `MEMORY.md` entries that would fall past',
      "the session index's size cap — the harness truncates silently, so the newest memories are",
      'the ones lost.',
    ],
    title: 'OpenThrottle guards plugin (Claude Code)',
  },
  {
    blockingLines: [
      '`bash-guard` **denies** a small set of commands that cannot succeed and warns, without',
      'denying, on the rest. It allows whenever it fails.',
    ],
    bundles: CURSOR_GUARDS_ENTRIES,
    dependencies: [],
    description: `Guards for Cursor: catches shell commands that fail invisibly (zsh globs and modifiers, BSD sed, masked exit status, gh writes to closed PRs). Works with or without an OpenThrottle server.`,
    disableRows: [
      [
        '`cursor-agent plugin marketplace`',
        'manage or remove the installed plugin',
      ],
    ],
    hookTableRows: [['`beforeShellExecution`', '`hooks/bash-guard.cjs`']],
    installLines: [
      'Pass the payload directory directly:',
      '',
      '```bash',
      'cursor-agent --plugin-dir /path/to/plugins/openthrottle-cursor-guards -p "…"',
      '```',
    ],
    kind: 'extension',
    label: 'Cursor',
    name: 'openthrottle-guards',
    renderHooks: (command) => ({
      hooks: {
        beforeShellExecution: [
          { command: command('bash-guard.cjs'), timeout: 10 },
        ],
      },
      version: 1,
    }),
    root: 'plugins/openthrottle-cursor-guards',
    rootVar: 'CURSOR_PLUGIN_ROOT',
    summaryLines: [...BASH_GUARD_SUMMARY],
    title: 'OpenThrottle guards plugin (Cursor)',
  },
];

/**
 * Plugin version, derived from the package version so there is exactly one
 * number to bump. Derived rather than hand-maintained because the drift gate
 * diffs `plugin.json` byte-for-byte — a hand-bumped field is a second source of
 * truth that silently rots.
 */
const readPluginVersion = (): string => {
  const pkg: unknown = JSON.parse(
    readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  );
  const hasVersion =
    typeof pkg === 'object' && pkg !== null && 'version' in pkg;
  const version = hasVersion ? Reflect.get(pkg, 'version') : undefined;
  if (typeof version !== 'string' || !version) {
    throw new Error('agentic-hooks package.json has no version');
  }
  return version;
};

/** Stable JSON: two-space indent + trailing newline, matching prettier. */
const renderJson = (value: unknown): string => {
  return `${JSON.stringify(value, null, 2)}\n`;
};

/**
 * The canonical Agent Plugins 1.0.0 identifier. The spec requires this exact
 * string: "For Agent Plugins 1.0.0, its value MUST be the canonical identifier
 * `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`." Clients use it
 * to select validation rules, so it is a version pin, not a docs link.
 */
const AGENT_PLUGINS_SCHEMA = `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`;

const pluginManifest = (payload: PluginPayload): Record<string, unknown> => {
  return {
    author: { name: 'OpenThrottle', url: 'https://github.com/OpenThrottle' },
    ...(payload.dependencies.length === 0
      ? {}
      : { dependencies: payload.dependencies }),
    description: payload.description,
    name: payload.name,
    version: readPluginVersion(),
  };
};

/**
 * Agent Plugins 1.0.0 §5.1: "Clients MUST check for a manifest at
 * `plugin.json` in the plugin root." `$schema` and `name` are the only
 * required fields.
 */
const renderRootManifest = (payload: PluginPayload): string => {
  return renderJson({
    $schema: AGENT_PLUGINS_SCHEMA,
    ...pluginManifest(payload),
  });
};

/**
 * The same manifest at `.claude-plugin/plugin.json`, which is a Claude Code
 * convention rather than anything in the spec — but one both shipping clients
 * read (Cursor's lookup order is `.cursor-plugin/`, then `.claude-plugin/`,
 * then the root). Duplicated deliberately, generated from one source so the
 * two can never disagree. See `docs/monorepo/agentic-hooks-standards-adr.md`.
 */
const renderClientManifest = (payload: PluginPayload): string => {
  return renderJson(pluginManifest(payload));
};

/**
 * Claude Code runs a hook command through a shell, so its root placeholder is
 * double-quoted: an install path with a space would otherwise split into
 * several words (`claude plugin validate` flags the unquoted form). Cursor's
 * command is left bare — nothing measured says it goes through a shell, and a
 * literal quote there would break the path instead of protecting it.
 */
const renderPluginHooks = (payload: PluginPayload): string => {
  const quote = payload.rootVar === 'CLAUDE_PLUGIN_ROOT' ? '"' : '';
  if (payload.renderHooks === null) {
    throw new Error(`${payload.root} has no hook config to render`);
  }
  return renderJson(
    payload.renderHooks(
      (file) => `${quote}\${${payload.rootVar}}/hooks/${file}${quote}`,
    ),
  );
};

const renderTable = (
  header: readonly [string, string],
  rows: readonly (readonly [string, string])[],
): readonly string[] => {
  return [
    `| ${header[0]} | ${header[1]} |`,
    '| --- | --- |',
    ...rows.map(([left, right]) => `| ${left} | ${right} |`),
  ];
};

const renderTelemetryReadme = (payload: TelemetryPayload): string => {
  return [
    '<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->',
    '',
    `# OpenThrottle skill-usage plugin (${payload.label})`,
    '',
    `Records **which** agent skills run under ${payload.label}, so OpenThrottle can report skill usage.`,
    '',
    "This payload is per-tool because a hook config names its own tool's events. See",
    '`packages/agentic-hooks/README.md` for the producer matrix.',
    '',
    '## Install',
    '',
    ...payload.installLines,
    '',
    'Installing once applies it in every repository you open — nothing is written into any of',
    'them. Where the CLI has a `--plugin-dir` flag (Claude Code, Cursor), OT-orchestrated runs',
    'pass it at spawn time and do not need this install.',
    '',
    'The payload published to the `plugins-dist` branch carries no `version`, so every publish is',
    'an update for installed copies.',
    '',
    '## What it collects',
    '',
    'Per skill invocation: the skill name, whether the skill is OpenThrottle-authored or',
    'third-party, a timestamp, the session id, the git branch, the normalized git remote of',
    'the repository (credentials stripped; nothing when there is no remote), and — on',
    'completion — an outcome (`success` / `error` / `abandoned`) and a duration.',
    '',
    'Outside the OpenThrottle monorepo the default privacy level is `name-only`: skill',
    '**arguments are not collected at all**. A secret redactor runs regardless of level.',
    'You can opt a specific repository in to `truncated` (redacted, 256 characters) by listing',
    'its remote in `OPENTHROTTLE_TELEMETRY_TRUNCATED_REPOS` in `~/.openthrottle/.env`; the',
    'repository itself and your shell environment cannot set it.',
    'No filesystem path is sent from your repository either: the working directory is',
    'reported only inside an OpenThrottle checkout, and the git remote identifies the',
    'repository everywhere else.',
    '',
    ...payload.heartbeatCollects,
    '## Configuring the endpoint',
    '',
    'Values are resolved by WHERE they live, under one set of names. Highest first:',
    '',
    ...renderTable(
      ['location', 'when it is read'],
      [
        [
          '`<repo>/.env`',
          'only in an OpenThrottle checkout — never in your repository',
        ],
        ['the process environment', 'always'],
        ['`~/.openthrottle/.env`', 'always — this is the one to use'],
      ],
    ),
    '',
    'A local OpenThrottle server writes this for you: on boot it fills its own URL and',
    'token into `~/.openthrottle/.env`, marking each line `# managed by openthrottle-server`',
    'and never touching a value you set yourself. Start or restart it and every checkout on',
    'the machine records. Worktree and containerized servers do not write it (the Docker',
    "install bind-mounts the host's `~/.openthrottle` so its server can).",
    '',
    'For a hosted server, put this in `~/.openthrottle/.env` yourself and nothing anywhere',
    'else:',
    '',
    '```sh',
    'OPENTHROTTLE_GRAPHQL_URL=https://your-openthrottle-server/graphql',
    'OPENTHROTTLE_MCP_AUTH_TOKEN=…',
    '```',
    '',
    'With no endpoint resolvable the hooks buffer to `~/.openthrottle/skill-usage/`',
    'and send nothing. Records are kept, not dropped — configure the endpoint later',
    'and the drain hook forwards them.',
    '',
    '## What it never does',
    '',
    '- It never writes inside your repository. Buffered telemetry goes to',
    '  `~/.openthrottle/skill-usage/`, never to a `.cache/` directory in your tree.',
    '- It never blocks or fails a tool call. Every hook is fail-open and exits 0.',
    "- It never reads your repository's `.env`. That layer is gated on the checkout",
    '  being OpenThrottle itself, and even there only `OPENTHROTTLE_*` keys are read.',
    '- It never forwards your email address, even where the tool puts one in every payload.',
    '- With no OpenThrottle server configured it sends nothing, silently.',
    '',
    'See `docs/monorepo/child-repo-hook-telemetry-contract.md` for the full contract.',
    '',
    '## Turning it off',
    '',
    ...renderTable(
      ['how', 'effect'],
      [
        ['`OPENTHROTTLE_TELEMETRY_OFFLINE=1`', 'buffers locally, never sends'],
        ...payload.disableRows,
      ],
    ),
    '',
    ...(payload.diagnosingLines.length === 0
      ? []
      : ['## Diagnosing', '', ...payload.diagnosingLines]),
    '## Hooks',
    '',
    ...renderTable(['event', 'handler'], payload.hookTableRows),
    '',
    ...(payload.captureNote === null ? [] : [payload.captureNote, '']),
    '## Authoring',
    '',
    'This directory is generated from `@openthrottle/agentic-hooks` and drift-checked in',
    'CI. Edit `packages/agentic-hooks/`, then run:',
    '',
    '```bash',
    'pnpm nx run @openthrottle/agentic-hooks:bundle-hooks',
    '```',
    '',
    'The plugin format also carries skills and MCP servers, so folding in OT skill injection',
    'later is an addition to this payload rather than a rewrite. v1 is hooks only.',
    '',
    '## License',
    '',
    'Apache-2.0, as part of the OpenThrottle monorepo. See `LICENSE.md` and `NOTICE` at the',
    'repository root.',
    '',
  ].join('\n');
};

const renderExtensionReadme = (payload: ExtensionPayload): string => {
  return [
    '<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->',
    '',
    `# ${payload.title}`,
    '',
    ...payload.summaryLines,
    '',
    '## Install',
    '',
    ...payload.installLines,
    '',
    'Installing once applies it in every repository you open — nothing is written into any of',
    'them. OT-orchestrated runs load it with `--plugin-dir` whether or not you installed it.',
    '',
    '## Can it block a tool call?',
    '',
    ...payload.blockingLines,
    '',
    '## What it never does',
    '',
    '- It never writes inside your repository. Any state it keeps lives under `~/.openthrottle/`.',
    "- It never reads your repository's `.env` unless the checkout is OpenThrottle itself.",
    '- It never fails because it crashed: every hook allows and exits 0 on an internal error.',
    '',
    '## Turning it off',
    '',
    ...renderTable(['how', 'effect'], payload.disableRows),
    '',
    '## Hooks',
    '',
    ...renderTable(['event', 'handler'], payload.hookTableRows),
    '',
    '## Authoring',
    '',
    'This directory is generated from `@openthrottle/agentic-hooks`. Edit',
    '`packages/agentic-hooks/`, then run:',
    '',
    '```bash',
    'pnpm nx run @openthrottle/agentic-hooks:bundle-hooks',
    '```',
    '',
    '## License',
    '',
    'Apache-2.0, as part of the OpenThrottle monorepo. See `LICENSE.md` and `NOTICE` at the',
    'repository root.',
    '',
  ].join('\n');
};

const renderPluginReadme = (payload: PluginPayload): string => {
  return payload.kind === 'telemetry'
    ? renderTelemetryReadme(payload)
    : renderExtensionReadme(payload);
};

/**
 * The committed stub a tool actually runs. It names only its own file, so it is
 * byte-identical across every rebuild of the bundle behind it. Setting
 * `process.argv[1]` keeps a CLI's own path logic (the doctor resolves the drain
 * beside itself) pointing into `dist/`, where its siblings are.
 */
const renderStub = (file: string): string => {
  return [
    '#!/usr/bin/env node',
    '',
    '// GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts',
    `// Runs ../dist/${file} when it has been built, and otherwise exits 0 without a word:`,
    '// a hook that is not there must never break the tool call it was meant to observe.',
    '',
    "'use strict';",
    '',
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    '',
    `const target = path.join(__dirname, '..', 'dist', ${JSON.stringify(file)});`,
    '',
    'if (fs.existsSync(target)) {',
    '  process.argv[1] = target;',
    '  require(target);',
    '} else {',
    '  process.exitCode = 0;',
    '}',
    '',
  ].join('\n');
};

const stubDir = (kind: PluginEntry['kind']): string => {
  return kind === 'bin' ? 'bin' : 'hooks';
};

/** Generated non-bundle files across every payload, keyed by workspace path. */
const pluginFiles = (): ReadonlyMap<string, string> => {
  return new Map(
    PLUGIN_PAYLOADS.flatMap((payload): readonly [string, string][] => [
      [`${payload.root}/plugin.json`, renderRootManifest(payload)],
      [
        `${payload.root}/.claude-plugin/plugin.json`,
        renderClientManifest(payload),
      ],
      ...(payload.renderHooks === null
        ? []
        : [[`${payload.root}/hooks/hooks.json`, renderPluginHooks(payload)]]),
      [`${payload.root}/README.md`, renderPluginReadme(payload)],
      ...payload.bundles.map((bundle): [string, string] => [
        `${payload.root}/${stubDir(bundle.kind)}/${bundle.file}`,
        renderStub(bundle.file),
      ]),
    ]),
  );
};

/**
 * A hook that lives in a plugin folder this script does not generate. The one
 * today is Antigravity's heartbeat: agy loads workspace plugins from
 * `.agents/plugins/*`, and that folder's manifest and `hooks.json` are written by
 * `scripts/sync-agent-config.ts`, which runs the handler with cwd = the plugin
 * folder. This script owns only the stub in its `hooks/` and the bundle in its
 * gitignored `dist/`, exactly as for a payload.
 */
interface StandaloneHook {
  readonly entry: string;
  readonly file: string;
  /** Workspace-relative plugin folder. */
  readonly root: string;
}

const STANDALONE_HOOKS: readonly StandaloneHook[] = [
  {
    entry: 'adapters/antigravity/heartbeat.ts',
    file: 'skill-usage-heartbeat.cjs',
    root: '.agents/plugins/openthrottle',
  },
];

/** Every payload's adapter bundles, as ordinary BundleSpec rows. */
const pluginBundleSpecs = (): readonly BundleSpec[] => {
  const payloadBundles = PLUGIN_PAYLOADS.flatMap((payload) =>
    payload.bundles.map((bundle): BundleSpec => ({
      entry: bundle.entry,
      outFile: `${payload.root}/dist/${bundle.file}`,
    })),
  );
  const standaloneBundles = STANDALONE_HOOKS.map((hook): BundleSpec => ({
    entry: hook.entry,
    outFile: `${hook.root}/dist/${hook.file}`,
  }));
  return [...payloadBundles, ...standaloneBundles];
};

const bannerFor = (spec: BundleSpec): string => {
  return [
    '#!/usr/bin/env node',
    '',
    '/**',
    ' * -------- GENERATED — DO NOT EDIT ------------------------------------',
    ` * Source: packages/agentic-hooks/src/${spec.entry}`,
    ' * Regenerate: pnpm nx run @openthrottle/agentic-hooks:bundle-hooks',
    ' * Authoring lives in @openthrottle/agentic-hooks; this file is a bundle.',
    ' * ----------------------------------------------------------------------',
    ' */',
    '',
  ].join('\n');
};

const renderBundle = async (spec: BundleSpec): Promise<string> => {
  const result = await build({
    banner: { js: bannerFor(spec) },
    bundle: true,
    charset: 'utf8',
    entryPoints: [path.join(packageRoot, 'src', spec.entry)],
    format: 'cjs',
    legalComments: 'none',
    minify: false,
    platform: 'node',
    sourcemap: false,
    target: 'node22',
    treeShaking: true,
    write: false,
  });
  const [output] = result.outputFiles;
  if (!output) {
    throw new Error(`esbuild produced no output for ${spec.entry}`);
  }
  return output.text;
};

/**
 * Everything this script owns, resolved to final bytes: the in-repo tool
 * bundles, the plugin payload's bundles, and the payload's generated JSON/MD.
 * Write and check both walk this one list so neither can miss an output.
 */
const renderAllArtifacts = async (): Promise<ReadonlyMap<string, string>> => {
  const allBundles = pluginBundleSpecs();
  const bundled = await Promise.all(
    allBundles.map(async (spec): Promise<readonly [string, string]> => [
      spec.outFile,
      await renderBundle(spec),
    ]),
  );
  return new Map([
    ...bundled,
    ...pluginFiles(),
    [DEV_MARKETPLACE_PATH, renderDevMarketplace()],
    ...STANDALONE_HOOKS.map((hook): [string, string] => [
      `${hook.root}/hooks/${hook.file}`,
      renderStub(hook.file),
    ]),
  ]);
};

/**
 * `dist/` holds the esbuild bundles. They are gitignored on main and published
 * to the `plugins-dist` branch, so the drift gate never compares them: `--check`
 * still builds every one in memory (a bundle that fails to build fails the
 * check), but diffs only what is committed.
 */
const isDistBundle = (outFile: string): boolean => {
  return /\/dist\/[^/]+\.cjs$/.test(outFile);
};

/**
 * The marketplace this checkout installs its own Claude Code plugins from
 * (`claude plugin marketplace add <checkout>/plugins`). Relative sources, so a
 * directory marketplace loads each plugin in place and a rebuilt bundle applies
 * at the next session. Named `openthrottle-dev` so it never collides with the
 * public `openthrottle` marketplace at the repo root, whose sources point at the
 * published `plugins-dist` branch instead.
 */
const DEV_MARKETPLACE_PATH = 'plugins/.claude-plugin/marketplace.json';

const renderDevMarketplace = (): string => {
  const claudePayloads = PLUGIN_PAYLOADS.filter(
    (payload) => payload.rootVar === 'CLAUDE_PLUGIN_ROOT',
  );
  return renderJson({
    $schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
    description: `This checkout's own OpenThrottle plugins, loaded in place. Generated by bundle-hooks; the public marketplace is .claude-plugin/marketplace.json at the repo root.`,
    name: 'openthrottle-dev',
    owner: { name: 'OpenThrottle', url: 'https://github.com/OpenThrottle' },
    plugins: claudePayloads.map((payload) => ({
      description: payload.description,
      name: payload.name,
      source: `./${path.basename(payload.root)}`,
    })),
  });
};

/** Only bundles are executables; the generated JSON/MD are plain files. */
const isExecutable = (outFile: string): boolean => {
  return outFile.endsWith('.cjs');
};

/**
 * Every directory whose `.cjs` files this script owns outright. A `.cjs` there
 * that the current run does not produce is stale — an adapter that was removed
 * or moved — and nothing but this sweep would ever notice it.
 */
const ownedCjsDirs = (): readonly string[] => {
  // The tool hook folders held full bundles until every hook moved into a
  // plugin payload. Still swept, so a stray copy there reads as drift rather
  // than as a second, silently stale registration.
  const retiredToolDirs = ['.claude/hooks', '.codex/hooks', '.cursor/hooks'];
  const payloadDirs = [...PLUGIN_PAYLOADS, ...STANDALONE_HOOKS].flatMap(
    (owner) => ['bin', 'dist', 'hooks'].map((dir) => `${owner.root}/${dir}`),
  );
  return [...retiredToolDirs, ...payloadDirs];
};

const staleFiles = (
  artifacts: ReadonlyMap<string, string>,
  includeDist: boolean,
): readonly string[] => {
  return ownedCjsDirs()
    .filter((dir) => includeDist || !dir.endsWith('/dist'))
    .flatMap((dir) => {
      const abs = path.join(workspaceRoot, dir);
      if (!existsSync(abs)) {
        return [];
      }
      return readdirSync(abs)
        .filter((name) => name.endsWith('.cjs'))
        .map((name) => `${dir}/${name}`)
        .filter((file) => !artifacts.has(file));
    });
};

const writeBundles = async (): Promise<void> => {
  const artifacts = await renderAllArtifacts();
  for (const stale of staleFiles(artifacts, true)) {
    rmSync(path.join(workspaceRoot, stale));
    process.stdout.write(`removed stale ${stale}\n`);
  }
  for (const [outFile, contents] of artifacts) {
    const outPath = path.join(workspaceRoot, outFile);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, contents, 'utf8');
    if (isExecutable(outFile)) {
      chmodSync(outPath, 0o755);
    }
    process.stdout.write(`wrote ${outFile}\n`);
  }
};

const checkBundles = async (): Promise<void> => {
  const artifacts = await renderAllArtifacts();
  const drifted: string[] = staleFiles(artifacts, false).map(
    (file) => `${file} (stale: no longer generated)`,
  );
  for (const [outFile, expected] of artifacts) {
    if (isDistBundle(outFile)) {
      continue;
    }
    const outPath = path.join(workspaceRoot, outFile);
    const actual = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
    if (actual !== expected) {
      drifted.push(outFile);
    }
  }
  if (drifted.length > 0) {
    process.stderr.write(
      `bundle-hooks drift detected in:\n${drifted
        .map((f) => `  - ${f}`)
        .join(
          '\n',
        )}\nRun: pnpm nx run @openthrottle/agentic-hooks:bundle-hooks\n`,
    );
    process.exit(1);
  }
  process.stdout.write(
    `bundle-hooks-check: ${artifacts.size} artifact(s) OK\n`,
  );
};

const main = async (): Promise<void> => {
  if (process.argv.includes('--check')) {
    await checkBundles();
    return;
  }
  await writeBundles();
};

main().catch((err: unknown) => {
  process.stderr.write(
    `bundle-hooks failed: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
