/**
 * @description Guard against the poisoned-Nx-cache class where `tsc --build`
 * no-ops against a truncated on-disk `dist/` and Nx then caches (or a consumer
 * reads) an incomplete build. See plan 935ea415 and the
 * poisoned-gcs-nx-remote-cache runbook.
 *
 * For a package root, assert that every emitting source module under `src/` has
 * a corresponding non-empty `.js` in `dist/`. Exits non-zero (with the missing
 * files listed) when the emitted output is incomplete, so a truncated dist fails
 * fast instead of being cached or consumed silently.
 *
 * Usage: node --experimental-strip-types scripts/verify-dist-complete.ts <projectRoot>
 * `<projectRoot>` is resolved relative to the current working directory
 * (workspace root when run through Nx).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.mts', '.cts'];

const isTestFile = (fileName: string): boolean =>
  /\.(spec|test)\.[cm]?tsx?$/.test(fileName);

const isDeclarationFile = (fileName: string): boolean =>
  /\.d\.[cm]?ts$/.test(fileName);

const isExcludedDir = (dirName: string): boolean =>
  dirName === '__tests__' ||
  dirName === '__mocks__' ||
  dirName === 'node_modules';

/** Recursively collect emitting source files (relative to `srcRoot`). */
const collectSourceFiles = (
  srcRoot: string,
  current: string = srcRoot,
): readonly string[] => {
  const entries = readdirSync(current, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (!isExcludedDir(entry.name)) {
        files.push(...collectSourceFiles(srcRoot, absolute));
      }
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const ext = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.includes(ext)) {
      continue;
    }
    if (isDeclarationFile(entry.name) || isTestFile(entry.name)) {
      continue;
    }
    files.push(path.relative(srcRoot, absolute));
  }

  return files;
};

/** Read `outDir` from tsconfig.lib.json, defaulting to `dist`. */
const resolveOutDir = (projectRoot: string): string => {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.lib.json');
  if (!existsSync(tsconfigPath)) {
    return 'dist';
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    const outDir =
      parsed &&
      typeof parsed === 'object' &&
      'compilerOptions' in parsed &&
      parsed.compilerOptions &&
      typeof parsed.compilerOptions === 'object' &&
      'outDir' in parsed.compilerOptions
        ? parsed.compilerOptions.outDir
        : undefined;
    return typeof outDir === 'string' ? outDir : 'dist';
  } catch {
    return 'dist';
  }
};

const isNonEmptyFile = (filePath: string): boolean =>
  existsSync(filePath) && statSync(filePath).size > 0;

const run = (): void => {
  const projectRootArg = process.argv[2];
  if (!projectRootArg) {
    console.error(
      'verify-dist-complete: error: missing <projectRoot> argument',
    );
    process.exit(1);
  }

  const projectRoot = path.resolve(process.cwd(), projectRootArg);
  const srcRoot = path.join(projectRoot, 'src');
  const outDir = resolveOutDir(projectRoot);
  const distRoot = path.join(projectRoot, outDir);

  if (!existsSync(srcRoot)) {
    console.error(
      `verify-dist-complete: error: no src/ directory at ${projectRootArg}`,
    );
    process.exit(1);
  }

  if (!existsSync(distRoot)) {
    console.error(
      `verify-dist-complete: error: ${outDir}/ is missing for ${projectRootArg} — the build produced no output`,
    );
    process.exit(1);
  }

  const sourceFiles = collectSourceFiles(srcRoot);
  const missing: string[] = [];

  for (const relative of sourceFiles) {
    const jsRelative = relative.replace(/\.[cm]?tsx?$/, '.js');
    // tsc may mirror the source path from the package root (dist/src/...) or
    // from src/ (dist/...); accept either so the guard is layout-agnostic.
    const candidates = [
      path.join(distRoot, 'src', jsRelative),
      path.join(distRoot, jsRelative),
    ];
    if (!candidates.some(isNonEmptyFile)) {
      missing.push(path.join('src', relative));
    }
  }

  if (missing.length > 0) {
    console.error(
      `verify-dist-complete: error: ${missing.length} source module(s) have no non-empty compiled .js in ${outDir}/ for ${projectRootArg}:`,
    );
    for (const file of missing) {
      console.error(`  - ${file}`);
    }
    console.error(
      'verify-dist-complete: the dist is truncated (likely a `tsc --build` no-op against stale/partial output). ' +
        'Rebuild with `--force` (e.g. `rm -rf dist && nx run <project>:build --skip-nx-cache`) and purge the poisoned Nx cache entry — see the poisoned-gcs-nx-remote-cache runbook.',
    );
    process.exit(1);
  }

  console.log(
    `verify-dist-complete: OK (${sourceFiles.length} source module(s) → ${outDir}/ for ${projectRootArg})`,
  );
};

run();
