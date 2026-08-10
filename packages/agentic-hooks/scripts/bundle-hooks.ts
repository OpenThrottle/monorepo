/**
 * Deterministic esbuild bundler for the agentic-hooks per-tool adapters.
 *
 * Each adapter is a TS entrypoint under `src/adapters/<tool>/`. This script
 * bundles each one into a self-contained CommonJS `.cjs` under that tool's hook
 * folder (`.claude/hooks/*.cjs`, `.cursor/hooks/*.cjs`, …). The shipped bundle
 * `require`s nothing outside node builtins — the neutral core is inlined — so
 * hooks run as bare `node x.cjs` in fresh checkouts / worktrees with no
 * `node_modules` present, preserving the zero-runtime-dependency guarantee.
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

const bannerFor = (spec: BundleSpec): string =>
  [
    '#!/usr/bin/env node',
    '/**',
    ' * GENERATED — DO NOT EDIT.',
    ` * Source: packages/agentic-hooks/src/${spec.entry}`,
    ' * Regenerate: pnpm nx run @openthrottle/agentic-hooks:bundle-hooks',
    ' * Authoring lives in @openthrottle/agentic-hooks; this file is a bundle.',
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

const writeBundles = async (): Promise<void> => {
  await Promise.all(
    BUNDLES.map(async (spec): Promise<void> => {
      const contents = await renderBundle(spec);
      const outPath = path.join(workspaceRoot, spec.outFile);
      mkdirSync(path.dirname(outPath), { recursive: true });
      writeFileSync(outPath, contents, 'utf8');
      chmodSync(outPath, 0o755);
      process.stdout.write(`bundled ${spec.entry} → ${spec.outFile}\n`);
    }),
  );
};

const checkBundles = async (): Promise<void> => {
  const results = await Promise.all(
    BUNDLES.map(async (spec): Promise<string | null> => {
      const expected = await renderBundle(spec);
      const outPath = path.join(workspaceRoot, spec.outFile);
      const actual = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
      return actual === expected ? null : spec.outFile;
    }),
  );
  const drifted = results.filter((f): f is string => f !== null);
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
  process.stdout.write(`bundle-hooks-check: ${BUNDLES.length} bundle(s) OK\n`);
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
