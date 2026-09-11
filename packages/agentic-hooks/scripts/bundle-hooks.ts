/**
 * Deterministic esbuild bundler for the agentic-hooks per-tool adapters, and
 * for the distributable Claude Code plugin payload built from the same sources.
 *
 * Each adapter is a TS entrypoint under `src/adapters/<tool>/`. This script
 * bundles each one into a self-contained CommonJS `.cjs` under that tool's hook
 * folder (`.claude/hooks/*.cjs`, `.cursor/hooks/*.cjs`, …). The shipped bundle
 * `require`s nothing outside node builtins — the neutral core is inlined — so
 * hooks run as bare `node x.cjs` in fresh checkouts / worktrees with no
 * `node_modules` present, preserving the zero-runtime-dependency guarantee.
 *
 * The plugin payload under `plugins/openthrottle/` is the SAME bundles wired to
 * `${CLAUDE_PLUGIN_ROOT}`-relative commands, so hooks reach child repositories
 * that this repo's `.claude/settings.json` can never touch. It is generated,
 * committed, and drift-checked exactly like the in-repo bundles — one artifact,
 * two delivery paths (marketplace install, and `--plugin-dir` at spawn time).
 * See `docs/monorepo/child-repo-hook-overlay.md`.
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
  readFileSync,
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
 * The single source of truth for which adapter entrypoints get bundled where.
 * To add a producer: add an entrypoint under `src/adapters/<tool>/` and a row
 * here, then run `pnpm nx run @openthrottle/agentic-hooks:bundle-hooks`.
 */
const BUNDLES: readonly BundleSpec[] = [
  {
    entry: 'adapters/claude/capture.ts',
    outFile: '.claude/hooks/skill-usage-capture.cjs',
  },
  {
    entry: 'adapters/claude/complete.ts',
    outFile: '.claude/hooks/skill-usage-complete.cjs',
  },
  {
    entry: 'adapters/claude/drain.ts',
    outFile: '.claude/hooks/skill-usage-drain.cjs',
  },
  {
    entry: 'adapters/claude/plan-run-janitor.ts',
    outFile: '.claude/hooks/plan-run-janitor.cjs',
  },
  {
    entry: 'adapters/claude/outcome.ts',
    outFile: '.claude/hooks/skill-usage-outcome.cjs',
  },
  {
    entry: 'adapters/claude/scope.ts',
    outFile: '.claude/hooks/skill-usage-scope.cjs',
  },
  {
    entry: 'adapters/cursor/capture.ts',
    outFile: '.cursor/hooks/skill-usage-capture.cjs',
  },
  {
    entry: 'adapters/cursor/complete.ts',
    outFile: '.cursor/hooks/skill-usage-complete.cjs',
  },
  // Codex reads hooks from ~/.codex/config.toml — the operator's home, never a
  // repo — so there is no in-repo hook folder to write into. The bundles still
  // have to live somewhere committed for an operator to point that config at,
  // and `.codex/hooks/` keeps them beside the other tools' rather than
  // inventing a second convention.
  {
    entry: 'adapters/codex/capture.ts',
    outFile: '.codex/hooks/skill-usage-capture.cjs',
  },
  {
    entry: 'adapters/codex/complete.ts',
    outFile: '.codex/hooks/skill-usage-complete.cjs',
  },
];

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
interface PluginPayload {
  /** Adapter entrypoints shipped in this payload. */
  readonly bundles: readonly PluginEntry[];
  /** Closing note explaining the capture wiring, or null when there is none. */
  readonly captureNote: string | null;
  /** Extra "turning it off" README rows beyond the tool-neutral one. */
  readonly disableRows: readonly (readonly [string, string])[];
  /** README table rows: [event, handler file]. */
  readonly hookTableRows: readonly (readonly [string, string])[];
  /** README lines for the install section, verbatim. */
  readonly installLines: readonly string[];
  /** Human label for this tool in prose. */
  readonly label: string;
  /**
   * The tool's own hook config object, built from a helper that resolves a
   * payload-relative handler to the command spelling that tool expands.
   */
  readonly renderHooks: (command: (file: string) => string) => unknown;
  /** Workspace-relative root of the committed payload directory. */
  readonly root: string;
  /** Env var expanded to the payload root in a hook command. */
  readonly rootVar: string;
}

/** One adapter entrypoint inside a payload's `hooks/` directory. */
interface PluginEntry {
  /** Entry TS file, relative to the package `src/` folder. */
  readonly entry: string;
  /** File name under `<root>/hooks/`. */
  readonly file: string;
}

/**
 * The adapters that are genuine hook handlers, bundled into a payload.
 *
 * Deliberately NOT every adapter: `drain`, `outcome`, `scope` and
 * `plan-run-janitor` are manual CLIs (`node …drain.cjs --budget-ms 500`), wired
 * to no event. Shipping them would be dead weight in someone else's repo. The
 * buffer still flushes — the completion handler drains opportunistically.
 */
const CLAUDE_PLUGIN_ENTRIES: readonly PluginEntry[] = [
  { entry: 'adapters/claude/capture.ts', file: 'skill-usage-capture.cjs' },
  { entry: 'adapters/claude/complete.ts', file: 'skill-usage-complete.cjs' },
];

const CURSOR_PLUGIN_ENTRIES: readonly PluginEntry[] = [
  { entry: 'adapters/cursor/capture.ts', file: 'skill-usage-capture.cjs' },
  { entry: 'adapters/cursor/complete.ts', file: 'skill-usage-complete.cjs' },
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
    disableRows: [['`/plugin uninstall openthrottle`', 'removes it entirely']],
    hookTableRows: [
      ['`PreToolUse` (matcher `Skill`)', '`hooks/skill-usage-capture.cjs`'],
      ['`UserPromptExpansion`', '`hooks/skill-usage-capture.cjs`'],
      ['`Stop`', '`hooks/skill-usage-complete.cjs`'],
    ],
    installLines: [
      '```bash',
      '/plugin marketplace add OpenThrottle/monorepo',
      '/plugin install openthrottle@openthrottle',
      '```',
    ],
    label: 'Claude Code',
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
    disableRows: [
      [
        '`cursor-agent plugin marketplace`',
        'manage or remove the installed plugin',
      ],
    ],
    hookTableRows: [
      ['`preToolUse`', '`hooks/skill-usage-capture.cjs`'],
      ['`beforeSubmitPrompt`', '`hooks/skill-usage-capture.cjs`'],
      ['`sessionEnd`', '`hooks/skill-usage-complete.cjs`'],
    ],
    installLines: [
      'Pass the payload directory directly:',
      '',
      '```bash',
      'cursor-agent --plugin-dir /path/to/plugins/openthrottle-cursor -p "…"',
      '```',
    ],
    label: 'Cursor',
    renderHooks: (command) => ({
      hooks: {
        beforeSubmitPrompt: [{ command: command('skill-usage-capture.cjs') }],
        preToolUse: [{ command: command('skill-usage-capture.cjs') }],
        sessionEnd: [{ command: command('skill-usage-complete.cjs') }],
      },
      version: 1,
    }),
    root: 'plugins/openthrottle-cursor',
    rootVar: 'CURSOR_PLUGIN_ROOT',
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
  const version =
    typeof pkg === 'object' && pkg !== null && 'version' in pkg
      ? Reflect.get(pkg, 'version')
      : undefined;
  if (typeof version !== 'string' || !version) {
    throw new Error('agentic-hooks package.json has no version');
  }
  return version;
};

/** Stable JSON: two-space indent + trailing newline, matching prettier. */
const renderJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;

/**
 * The canonical Agent Plugins 1.0.0 identifier. The spec requires this exact
 * string: "For Agent Plugins 1.0.0, its value MUST be the canonical identifier
 * `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`." Clients use it
 * to select validation rules, so it is a version pin, not a docs link.
 */
const AGENT_PLUGINS_SCHEMA =
  'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';

const pluginManifest = (payload: PluginPayload): Record<string, unknown> => ({
  author: { name: 'OpenThrottle', url: 'https://github.com/OpenThrottle' },
  description: `Records which agent skills run under ${payload.label}, so OpenThrottle can report skill usage. Telemetry only — it never modifies your repository and never blocks a tool call.`,
  name: 'openthrottle',
  version: readPluginVersion(),
});

/**
 * Agent Plugins 1.0.0 §5.1: "Clients MUST check for a manifest at
 * `plugin.json` in the plugin root." `$schema` and `name` are the only
 * required fields.
 */
const renderRootManifest = (payload: PluginPayload): string =>
  renderJson({ $schema: AGENT_PLUGINS_SCHEMA, ...pluginManifest(payload) });

/**
 * The same manifest at `.claude-plugin/plugin.json`, which is a Claude Code
 * convention rather than anything in the spec — but one both shipping clients
 * read (Cursor's lookup order is `.cursor-plugin/`, then `.claude-plugin/`,
 * then the root). Duplicated deliberately, generated from one source so the
 * two can never disagree. See `docs/monorepo/agentic-hooks-standards-adr.md`.
 */
const renderClientManifest = (payload: PluginPayload): string =>
  renderJson(pluginManifest(payload));

const renderPluginHooks = (payload: PluginPayload): string =>
  renderJson(
    payload.renderHooks((file) => `\${${payload.rootVar}}/hooks/${file}`),
  );

const renderTable = (
  header: readonly [string, string],
  rows: readonly (readonly [string, string])[],
): readonly string[] => [
  `| ${header[0]} | ${header[1]} |`,
  '| --- | --- |',
  ...rows.map(([left, right]) => `| ${left} | ${right} |`),
];

const renderPluginReadme = (payload: PluginPayload): string =>
  [
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
    'them. OT-orchestrated runs do not need this: the driver passes `--plugin-dir` at spawn time,',
    'so an orchestrated run carries the same hooks whether or not you have installed anything.',
    '',
    'The plugin version tracks `@openthrottle/agentic-hooks`, so a version bump there is what',
    'users see.',
    '',
    '## What it collects',
    '',
    'Per skill invocation: the skill name, whether the skill is OpenThrottle-authored or',
    'third-party, a timestamp, the session id, the git branch, and — on completion — an',
    'outcome (`success` / `error` / `abandoned`) and a duration.',
    '',
    'Outside the OpenThrottle monorepo the default privacy level is `name-only`: skill',
    '**arguments are not collected at all**. A secret redactor runs regardless of level.',
    '',
    '## What it never does',
    '',
    '- It never writes inside your repository.',
    '- It never blocks or fails a tool call. Every hook is fail-open and exits 0.',
    '- It never reads your `.env`. Outside the OpenThrottle monorepo the endpoint comes',
    '  only from the environment or from your own `~/.openthrottle/hooks.json`.',
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
        ['`SKILL_USAGE_DISABLE_SERVER=1`', 'buffers locally, never sends'],
        ...payload.disableRows,
      ],
    ),
    '',
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

/** Generated non-bundle files across every payload, keyed by workspace path. */
const pluginFiles = (): ReadonlyMap<string, string> =>
  new Map(
    PLUGIN_PAYLOADS.flatMap((payload): readonly [string, string][] => [
      [`${payload.root}/plugin.json`, renderRootManifest(payload)],
      [
        `${payload.root}/.claude-plugin/plugin.json`,
        renderClientManifest(payload),
      ],
      [`${payload.root}/hooks/hooks.json`, renderPluginHooks(payload)],
      [`${payload.root}/README.md`, renderPluginReadme(payload)],
    ]),
  );

/** Every payload's adapter bundles, as ordinary BundleSpec rows. */
const pluginBundleSpecs = (): readonly BundleSpec[] =>
  PLUGIN_PAYLOADS.flatMap((payload) =>
    payload.bundles.map((bundle): BundleSpec => ({
      entry: bundle.entry,
      outFile: `${payload.root}/hooks/${bundle.file}`,
    })),
  );

const bannerFor = (spec: BundleSpec): string =>
  [
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
  const allBundles = [...BUNDLES, ...pluginBundleSpecs()];
  const bundled = await Promise.all(
    allBundles.map(async (spec): Promise<readonly [string, string]> => [
      spec.outFile,
      await renderBundle(spec),
    ]),
  );
  return new Map([...bundled, ...pluginFiles()]);
};

/** Only bundles are executables; the generated JSON/MD are plain files. */
const isExecutable = (outFile: string): boolean => outFile.endsWith('.cjs');

const writeBundles = async (): Promise<void> => {
  const artifacts = await renderAllArtifacts();
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
  const drifted: string[] = [];
  for (const [outFile, expected] of artifacts) {
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
