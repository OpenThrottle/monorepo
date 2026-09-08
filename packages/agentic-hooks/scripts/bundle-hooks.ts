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
];

/**
 * Root of the distributable Claude Code plugin payload, relative to the
 * workspace root. A REAL committed directory, not gitignored build output: leg
 * B points a running server's `--plugin-dir` at this path in place, so it has
 * to exist in a plain checkout with nothing built.
 */
const PLUGIN_ROOT = 'plugins/openthrottle';

/**
 * The adapters that are genuine hook handlers, bundled into the plugin payload.
 *
 * Deliberately NOT all five claude adapters: `drain`, `outcome`, and `scope` are
 * manual CLIs (`node …drain.cjs --budget-ms 500`), wired to no event. Shipping
 * them would be dead weight in someone else's repo. The buffer still flushes —
 * `complete` drains opportunistically on `Stop`.
 */
const PLUGIN_BUNDLES: readonly BundleSpec[] = [
  {
    entry: 'adapters/claude/capture.ts',
    outFile: `${PLUGIN_ROOT}/hooks/skill-usage-capture.cjs`,
  },
  {
    entry: 'adapters/claude/complete.ts',
    outFile: `${PLUGIN_ROOT}/hooks/skill-usage-complete.cjs`,
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

const renderPluginManifest = (): string =>
  renderJson({
    author: { name: 'OpenThrottle', url: 'https://github.com/OpenThrottle' },
    description:
      'Records which agent skills run, so OpenThrottle can report skill usage. Telemetry only — it never modifies your repository and never blocks a tool call.',
    name: 'openthrottle',
    version: readPluginVersion(),
  });

/**
 * Hook wiring for the payload. Mirrors this repo's `.claude/settings.json`
 * `hooks` block, with `${CLAUDE_PLUGIN_ROOT}`-relative commands instead of
 * `./.claude/hooks/` ones.
 *
 * Every event here was proved to fire under headless `claude -p` (spike, task
 * 01bfe79c). `PreToolUse` and `UserPromptExpansion` are complementary rather
 * than redundant: a skill reached as a tool raises the former, a skill reached
 * as a slash command raises the latter, and a session hits one or the other.
 */
const renderPluginHooks = (): string => {
  const capture = '${CLAUDE_PLUGIN_ROOT}/hooks/skill-usage-capture.cjs';
  const complete = '${CLAUDE_PLUGIN_ROOT}/hooks/skill-usage-complete.cjs';
  return renderJson({
    hooks: {
      PreToolUse: [
        {
          hooks: [
            {
              command: capture,
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
              command: complete,
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
              command: capture,
              statusMessage: 'Skill usage capture (UserPromptExpansion)',
              type: 'command',
            },
          ],
        },
      ],
    },
  });
};

const renderPluginReadme = (): string =>
  [
    '<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->',
    '',
    '# OpenThrottle skill-usage plugin',
    '',
    'Records **which** agent skills run, so OpenThrottle can report skill usage.',
    '',
    '## Install',
    '',
    '```bash',
    '/plugin marketplace add OpenThrottle/monorepo',
    '/plugin install openthrottle@openthrottle',
    '```',
    '',
    'Installing once applies it in every repository you open — nothing is written into any of',
    'them. OT-orchestrated runs do not need this: the driver passes `--plugin-dir` at spawn time,',
    'so an orchestrated run carries the same hooks whether or not you have installed anything.',
    '',
    'To update, re-run `/plugin marketplace update openthrottle`. The plugin version tracks',
    '`@openthrottle/agentic-hooks`, so a version bump there is what users see.',
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
    '- With no OpenThrottle server configured it sends nothing, silently.',
    '',
    'See `docs/monorepo/child-repo-hook-telemetry-contract.md` for the full contract.',
    '',
    '## Turning it off',
    '',
    '| how | effect |',
    '| --- | --- |',
    '| `SKILL_USAGE_DISABLE_SERVER=1` | buffers locally, never sends |',
    '| `/plugin uninstall openthrottle` | removes it entirely |',
    '',
    '## Hooks',
    '',
    '| event | handler |',
    '| --- | --- |',
    '| `PreToolUse` (matcher `Skill`) | `hooks/skill-usage-capture.cjs` |',
    '| `UserPromptExpansion` | `hooks/skill-usage-capture.cjs` |',
    '| `Stop` | `hooks/skill-usage-complete.cjs` |',
    '',
    'The two capture events are complementary, not redundant: a skill invoked as a tool',
    'raises `PreToolUse`, a skill invoked as a slash command raises `UserPromptExpansion`.',
    '',
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

/** Generated non-bundle files in the payload, keyed by workspace-relative path. */
const pluginFiles = (): ReadonlyMap<string, string> =>
  new Map([
    [`${PLUGIN_ROOT}/.claude-plugin/plugin.json`, renderPluginManifest()],
    [`${PLUGIN_ROOT}/hooks/hooks.json`, renderPluginHooks()],
    [`${PLUGIN_ROOT}/README.md`, renderPluginReadme()],
  ]);

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
  const allBundles = [...BUNDLES, ...PLUGIN_BUNDLES];
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
