#!/usr/bin/env node

import { glob, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLogger, positionals } from './lib/index.ts';

const logger = createLogger();

/**
 * @description Fails when a Node builtin is reachable from a React Router app's
 * CLIENT bundle. Vite externalizes `node:*` for the browser and replaces it with a
 * Proxy that throws on first property access, so `typecheck`, `lint` and `build`
 * all pass and the break is deferred to the moment a page loads (see OT plan
 * a69a8b4c). The stub carries a fixed message, which is the fingerprint this
 * check looks for in `build/client`.
 *
 * The check is transitive by construction: it reads what the bundler actually put
 * in the client graph, so `isRecord` -> package barrel -> `node:os` is caught the
 * same as a direct import. Nothing here needs a list of "client-safe" packages —
 * a package reached only through `*.server.ts` or `import type` never enters the
 * client bundle and so can never be flagged.
 */

/** Vite's browser-externalization stub. Task 3's fixture build guards the wording. */
export const EXTERNALIZED_STUB_PATTERN =
  /Module\s*[`'"\\]+\s*([a-zA-Z0-9:@/._-]+)\s*[`'"\\]+\s*has been externalized for browser compatibility/g;

/** Server-only and test modules never ship to the browser, so they are never culprits. */
export const NON_CLIENT_PATTERNS = [
  /\.server\.tsx?$/,
  /\.test\.tsx?$/,
  /(^|\/)__tests__\//,
] as const;

export const APP_CLIENT_OUTPUT = 'build/client';

export const SOURCE_GLOBS = [
  'applications/*/app/**/*.ts',
  'applications/*/app/**/*.tsx',
  'packages/*/src/**/*.ts',
  'packages/*/src/**/*.tsx',
] as const;

export interface BuildAsset {
  contents: string;
  file: string;
}

export interface ClientBoundaryViolation {
  builtin: string;
  file: string;
}

/**
 * @description Pure detector — given the emitted client assets, returns every Node
 * builtin the bundler externalized, deduplicated per (builtin, file). Exported for
 * unit testing.
 */
export const findExternalizedBuiltins = (
  assets: readonly BuildAsset[],
): ClientBoundaryViolation[] => {
  const seen = new Set<string>();
  const violations: ClientBoundaryViolation[] = [];

  for (const { contents, file } of assets) {
    for (const match of contents.matchAll(EXTERNALIZED_STUB_PATTERN)) {
      const builtin = match[1];
      const key = `${builtin}\u0000${file}`;

      if (!seen.has(key)) {
        seen.add(key);
        violations.push({ builtin, file });
      }
    }
  }

  return violations;
};

/**
 * @description Best-effort culprit finder for the failure message. A minified chunk
 * cannot name the module that pulled the builtin in, so instead report source files
 * that actually `import`/`require` it and could plausibly ship to the browser.
 *
 * Matching an import STATEMENT rather than a bare mention is what keeps this list
 * short enough to read: across this workspace the loose form returns ~40 files, the
 * strict form 5. Pure; exported for unit testing.
 */
export const findLikelyImporters = (
  builtins: readonly string[],
  sources: readonly BuildAsset[],
): string[] => {
  const patterns = [...new Set(builtins)].map(
    (builtin) =>
      new RegExp(
        `(?:from|import|require\\()\\s*['"\`]${builtin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`,
      ),
  );

  return sources
    .filter(({ contents, file }) => {
      if (NON_CLIENT_PATTERNS.some((pattern) => pattern.test(file))) {
        return false;
      }

      return patterns.some((pattern) => pattern.test(contents));
    })
    .map(({ file }) => file)
    .sort();
};

const readAssets = async (directory: string): Promise<BuildAsset[]> => {
  const files = await Array.fromAsync(glob('**/*.js', { cwd: directory }));

  return Promise.all(
    files.map(async (file) => ({
      contents: await readFile(join(directory, file), 'utf8'),
      file,
    })),
  );
};

const readSources = async (workspaceRoot: string): Promise<BuildAsset[]> => {
  const files = (
    await Promise.all(
      SOURCE_GLOBS.map((pattern) =>
        Array.fromAsync(glob(pattern, { cwd: workspaceRoot })),
      ),
    )
  ).flat();

  return Promise.all(
    files.map(async (file) => ({
      contents: await readFile(join(workspaceRoot, file), 'utf8'),
      file,
    })),
  );
};

async function main(): Promise<void> {
  const [appDirectory = process.cwd()] = positionals();
  const clientOutput = join(appDirectory, APP_CLIENT_OUTPUT);
  const assets = await readAssets(clientOutput);

  if (assets.length === 0) {
    logger.fail(
      `No client assets under ${relative(process.cwd(), clientOutput) || clientOutput}. Run the app's "build" target first.`,
    );
    process.exit(1);
  }

  const violations = findExternalizedBuiltins(assets);

  if (violations.length === 0) {
    logger.success(
      `Client bundle is Node-free (${assets.length} asset(s) scanned).`,
    );

    return;
  }

  const builtins = [
    ...new Set(violations.map(({ builtin }) => builtin)),
  ].sort();
  const importers = findLikelyImporters(builtins, await readSources('.'));

  logger.fail('Node builtins reached the client bundle:');
  logger.blank();
  for (const { builtin, file } of violations) {
    logger.detail(`${APP_CLIENT_OUTPUT}/${file} → ${builtin}`);
  }

  if (importers.length > 0) {
    logger.blank();
    logger.detail(
      'Candidate source files importing those builtins (tests and *.server.ts excluded):',
    );
    for (const file of importers) {
      logger.detail(`  ${file}`);
    }
  }

  logger.blank();
  logger.fail(
    [
      `${builtins.join(', ')} will throw the moment a page loads — typecheck, lint and build all pass regardless.`,
      '',
      'Pick one of the three escape hatches this repo already uses:',
      '  1. Move the code server-side (this is what fixed the original break:',
      '     expandHome moved to applications/openthrottle-server/src/services/paths/).',
      '  2. Import it with `import type` so the import is erased at compile time.',
      '  3. Put it behind a `*.server.ts` module, which never enters the client bundle.',
      '',
      'Beware barrels: one `node:*` import anywhere in a package barrel reaches every',
      'client module that imports anything from that package.',
    ].join('\n'),
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
