/**
 * @description Guards the package-entrypoint contract that turned CI red
 * shard-dependently: a workspace package whose `exports` steer Vite/Vitest into
 * a gitignored build directory can only be imported by name once something else
 * happened to build it first, so whether a suite collects is decided by shard
 * assignment rather than by the code.
 *
 * The gate is deliberately narrow. Pointing the `import` condition at a
 * gitignored build directory is the workspace norm and is harmless on its own —
 * consumers get the package built through Nx `^build`. It only breaks when the
 * package's *own* sources import it by name, because a project's `test` target
 * never depends on its own `build`. So:
 *
 * 1. error — the condition Vite resolves (`import`, or a bare/`default` string)
 *    points into a gitignored build directory AND the package's own `src/**`
 *    imports the package by its own name. This is the guaranteed break.
 * 2. warn — the same mis-pointed condition without a self-referential import: a
 *    latent landmine that arms itself the moment someone writes an entry test.
 *
 * Ignored directories are read from the real `.gitignore` via `git check-ignore`
 * rather than hardcoding `dist`, so a package that commits its build output is
 * not flagged.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WORKSPACE_DIRS = ['applications', 'packages', 'tools'] as const;

/**
 * @description Conditions Vite/Vitest resolve when importing a package by name
 */
const VITE_CONDITIONS = ['import', 'default'] as const;

interface ExportTarget {
  /** Dotted condition path, e.g. `.` › `import` */
  readonly condition: string;
  /** Subpath key from the `exports` map, e.g. `.` or `./testing` */
  readonly subpath: string;
  /** The declared target, e.g. `./dist/src/index.js` */
  readonly target: string;
}

interface PackageInfo {
  readonly directory: string;
  readonly exportTargets: readonly ExportTarget[];
  readonly importsItselfByName: boolean;
  readonly main: string | undefined;
  readonly name: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @description Flattens an `exports` map into one entry per declared string target
 */
const collectExportTargets = (
  value: unknown,
  subpath: string,
  condition: string,
): readonly ExportTarget[] => {
  if (typeof value === 'string') {
    return [{ condition, subpath, target: value }];
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nested]) =>
    key.startsWith('.')
      ? collectExportTargets(nested, key, condition)
      : collectExportTargets(nested, subpath, key),
  );
};

/**
 * @description True when any file under the package's own `src/` imports the
 * package by its published name — the pattern that turns a mis-pointed `import`
 * condition into a hard, shard-dependent failure
 */
const importsSelfByName = (directory: string, name: string): boolean => {
  const sourceDir = path.join(directory, 'src');

  if (!existsSync(sourceDir)) return false;

  try {
    execFileSync(
      'git',
      ['grep', '--quiet', '--fixed-strings', `from '${name}'`, '--', sourceDir],
      { cwd: ROOT, stdio: 'ignore' },
    );

    return true;
  } catch {
    // `git grep` exits 1 when nothing matched.
    return false;
  }
};

const readPackageInfo = (directory: string): PackageInfo | undefined => {
  const manifestPath = path.join(directory, 'package.json');

  if (!existsSync(manifestPath)) return undefined;

  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!isRecord(parsed) || typeof parsed.name !== 'string') return undefined;

  const main = typeof parsed.main === 'string' ? parsed.main : undefined;
  const modulePath = typeof parsed.module === 'string' ? parsed.module : main;

  return {
    directory,
    exportTargets: collectExportTargets(parsed.exports, '.', 'default'),
    importsItselfByName: importsSelfByName(directory, parsed.name),
    main: modulePath,
    name: parsed.name,
  };
};

const listPackages = (): readonly PackageInfo[] =>
  WORKSPACE_DIRS.flatMap((workspaceDir) => {
    const absolute = path.join(ROOT, workspaceDir);

    if (!existsSync(absolute)) return [];

    return readdirSync(absolute, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readPackageInfo(path.join(absolute, entry.name)))
      .filter((info): info is PackageInfo => info !== undefined);
  });

/**
 * @description Asks git which of the given repo-relative paths are ignored
 */
const partitionIgnored = (
  relativePaths: readonly string[],
): ReadonlySet<string> => {
  if (relativePaths.length === 0) return new Set();

  try {
    const output = execFileSync('git', ['check-ignore', '--stdin'], {
      cwd: ROOT,
      encoding: 'utf8',
      input: relativePaths.join('\n'),
    });

    return new Set(output.split('\n').filter(Boolean));
  } catch {
    // `git check-ignore` exits 1 when nothing matched, which is not an error.
    return new Set();
  }
};

const pointsAtSource = (entry: string | undefined): boolean =>
  entry !== undefined && entry.replace(/^\.\//, '').startsWith('src/');

const run = (): void => {
  const packages = listPackages();

  const candidates = packages.flatMap((info) =>
    info.exportTargets
      .filter((exportTarget) =>
        VITE_CONDITIONS.some(
          (condition) => condition === exportTarget.condition,
        ),
      )
      .map((exportTarget) => ({
        exportTarget,
        info,
        relativePath: path.relative(
          ROOT,
          path.join(info.directory, exportTarget.target.replace(/\*/g, 'x')),
        ),
      })),
  );

  const ignored = partitionIgnored(
    candidates.map((entry) => entry.relativePath),
  );

  const offenders = candidates.filter(
    (entry) =>
      ignored.has(entry.relativePath) && pointsAtSource(entry.info.main),
  );

  const describe = (entry: (typeof offenders)[number]): string =>
    `${entry.info.name}: exports["${entry.exportTarget.subpath}"].${entry.exportTarget.condition} → ${entry.exportTarget.target} is gitignored, but main/module → ${entry.info.main}. ` +
    `Vite and Vitest resolve the "${entry.exportTarget.condition}" condition, so importing this package by name only resolves once its build has run. ` +
    `Point that condition at the source entry and leave "require"/"types" on the build output.`;

  const errors = offenders
    .filter((entry) => entry.info.importsItselfByName)
    .map(
      (entry) =>
        `${describe(entry)} This package's own src/ imports it by name, so its test target — which never depends on its own build — fails whenever no other project on the shard built it first.`,
    );

  const warnings = offenders
    .filter((entry) => !entry.info.importsItselfByName)
    .map(
      (entry) =>
        `${describe(entry)} No self-referential import today, so nothing breaks yet.`,
    );

  const verbose = process.argv.includes('--verbose');

  if (warnings.length > 0 && verbose) {
    for (const warning of warnings) {
      console.warn(`check-package-entrypoints: warning: ${warning}`);
    }
  } else if (warnings.length > 0) {
    const latentPackages = new Set(
      offenders
        .filter((entry) => !entry.info.importsItselfByName)
        .map((entry) => entry.info.name),
    );

    console.warn(
      `check-package-entrypoints: ${latentPackages.size} package(s) point a Vite-resolved condition at a gitignored build directory with no self-referential import — latent, not failing. Re-run with --verbose to list them.`,
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`check-package-entrypoints: error: ${error}`);
    }
    console.error(
      `check-package-entrypoints: ${errors.length} violation(s) across ${packages.length} workspace package(s)`,
    );
    process.exit(1);
  }

  console.log(
    `check-package-entrypoints: OK (${packages.length} workspace package(s), ${warnings.length} warning(s))`,
  );
};

run();
