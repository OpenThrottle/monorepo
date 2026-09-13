/**
 * @description Guards the package-entrypoint contract: a workspace package whose
 * `exports` steer a consumer into a gitignored build directory can only be
 * imported by name once something else happened to build it first.
 *
 * Two consumers resolve `exports`, and each has its own failure mode:
 *
 * - **Vite/Vitest** read `import`/`default` at runtime. A mis-pointed condition
 *   here turned CI red shard-dependently — whether a suite collected was decided
 *   by shard assignment rather than by the code.
 * - **TypeScript under NodeNext** reads `types`. A mis-pointed condition here
 *   makes the package unimportable by name at typecheck time — `TS2305`, "has no
 *   exported member" — unless the consumer holds a tsconfig project reference, or
 *   the package's emitted declarations carry `.ts`-extensioned re-exports.
 *
 * The gate is deliberately narrow. Pointing a condition at a gitignored build
 * directory is the workspace norm for a package that genuinely ships one, and is
 * harmless on its own — consumers get it built through Nx `^build`. Only packages
 * whose own `main`/`module` already names `src/` are considered, because those
 * ship no build output a consumer should be reading.
 *
 * 1. error — a *runtime* condition (`import`, or a bare/`default` string) points
 *    into a gitignored build directory AND the package's own `src/**` imports the
 *    package by its own name. This is the guaranteed break: a project's `test`
 *    target never depends on its own `build`.
 * 2. error — the package is not listed in the shrink-only baseline (see below).
 *    A newly mis-pointed condition is always cheaper to fix at the moment it is
 *    written than after it has been inherited.
 * 3. warn — any other mis-pointed condition, `types` included, on a package the
 *    baseline already lists: a latent landmine that arms itself the moment
 *    someone writes an entry test or imports the package from a NodeNext project.
 *
 * ## The baseline is a ratchet
 *
 * {@link BASELINE_PATH} freezes the packages that were already offending, so the
 * gate can error on *new* offenders without first requiring the existing
 * population to be fixed. It is keyed on package names, not warning strings: the
 * warning text churns with the remediation message, and the warning count is an
 * artifact of the `./*` subpath map rather than a measure of the problem.
 *
 * Crucially, a baselined package that *stops* offending is also an error — the
 * file must be pruned. That asymmetry is what makes this a ratchet rather than a
 * suppression list: the listed population can only shrink, and a stale entry can
 * never quietly re-authorize a regression.
 *
 * Ignored directories are read from the real `.gitignore` via `git check-ignore`
 * rather than hardcoding `dist`, so a package that commits its build output is
 * not flagged.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createLogger, hasFlag } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();
const WORKSPACE_DIRS = ['applications', 'packages', 'tools'] as const;

/**
 * @description Repo-relative path to the shrink-only baseline — the packages that
 * were already offending when the gate started erroring on new ones
 */
const BASELINE_PATH = 'scripts/check-package-entrypoints.baseline.txt';

/**
 * @description Every condition a consumer resolves when importing a package by
 * name — `import`/`default` by Vite and Vitest, `types` by TypeScript under
 * NodeNext
 */
const RESOLVED_CONDITIONS = ['default', 'import', 'types'] as const;

/**
 * @description The subset of {@link RESOLVED_CONDITIONS} that decides whether
 * code *runs*. Only these can produce the shard-dependent test failure that makes
 * an offender an error rather than a warning; a mis-pointed `types` condition
 * breaks typechecking, which is a different (and currently warn-only) problem.
 */
const RUNTIME_CONDITIONS = ['default', 'import'] as const;

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

/**
 * @description Reads the baseline package names, skipping blank lines and `#`
 * comments. A missing file is an empty baseline, which makes every offender new
 * — the correct reading once the file has been deleted at zero.
 */
const readBaseline = (): ReadonlySet<string> => {
  const absolute = path.join(ROOT, BASELINE_PATH);

  if (!existsSync(absolute)) return new Set();

  const names = readFileSync(absolute, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  return new Set(names);
};

const run = (): void => {
  const packages = listPackages();

  const candidates = packages.flatMap((info) =>
    info.exportTargets
      .filter((exportTarget) =>
        RESOLVED_CONDITIONS.some(
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

  const describe = (entry: (typeof offenders)[number]): string => {
    const { condition, subpath, target } = entry.exportTarget;

    const resolver =
      condition === 'types'
        ? 'TypeScript resolves the "types" condition under NodeNext'
        : `Vite and Vitest resolve the "${condition}" condition`;

    return (
      `${entry.info.name}: exports["${subpath}"].${condition} → ${target} is gitignored, but main/module → ${entry.info.main}. ` +
      `${resolver}, so importing this package by name only resolves once its build has run. ` +
      `Point EVERY condition at the source entry: a package whose main/module already names src/ ships no build output a consumer should read — the "__build"/"__build-package" target placeholder marks these — so "require" and "types" belong on source too. ` +
      `A dist-targeted "types" condition is resolvable only when the consumer holds a tsconfig project reference to this package, or when its emitted declarations carry .ts-extensioned re-exports.`
    );
  };

  const isRuntimeCondition = (entry: (typeof offenders)[number]): boolean =>
    RUNTIME_CONDITIONS.some(
      (condition) => condition === entry.exportTarget.condition,
    );

  const baseline = readBaseline();
  const offendingPackages = new Set(offenders.map((entry) => entry.info.name));

  const isSelfImportBreak = (entry: (typeof offenders)[number]): boolean =>
    entry.info.importsItselfByName && isRuntimeCondition(entry);

  const errors = offenders
    .filter(isSelfImportBreak)
    .map(
      (entry) =>
        `${describe(entry)} This package's own src/ imports it by name, so its test target — which never depends on its own build — fails whenever no other project on the shard built it first.`,
    );

  // A package the baseline does not list is newly mis-pointed. Erroring here is
  // what stops the population growing; it is reported once per package rather
  // than once per condition, since the fix is a single `exports` map either way.
  const newOffenders = [...offendingPackages]
    .filter((name) => !baseline.has(name))
    .sort();

  const newOffenderErrors = newOffenders.map((name) => {
    const first = offenders.find((entry) => entry.info.name === name);

    return (
      `${first === undefined ? name : describe(first)} ` +
      `This package is NEWLY flagged — it is not in ${BASELINE_PATH}. ` +
      `Fix it rather than adding a line: either point EVERY condition at the source entry, or — if it genuinely ships a build consumers should read — move main/module off src/ to the built entry, which removes it from this gate's candidate set entirely. ` +
      `The baseline is shrink-only and must not grow.`
    );
  });

  // A baselined package that no longer offends has to leave the file, or the
  // baseline slowly becomes a list of things that would be re-allowed to break.
  const staleBaselineErrors = [...baseline]
    .filter((name) => !offendingPackages.has(name))
    .sort()
    .map(
      (name) =>
        `${name} is listed in ${BASELINE_PATH} but no longer points any resolved condition at a gitignored build directory. ` +
        `Delete its line — the baseline is a shrink-only ratchet, and a stale entry would silently re-authorize a regression in this package.`,
    );

  const warnings = offenders
    .filter(
      (entry) => !isSelfImportBreak(entry) && baseline.has(entry.info.name),
    )
    .map((entry) =>
      entry.exportTarget.condition === 'types'
        ? `${describe(entry)} No NodeNext consumer imports this package by name today, so nothing breaks yet.`
        : `${describe(entry)} No self-referential import today, so nothing breaks yet.`,
    );

  const verbose = hasFlag('verbose');

  if (warnings.length > 0 && verbose) {
    for (const warning of warnings) {
      logger.warn(`check-package-entrypoints: warning: ${warning}`);
    }
  } else if (warnings.length > 0) {
    const latentPackages = new Set(
      offenders
        .filter(
          (entry) => !isSelfImportBreak(entry) && baseline.has(entry.info.name),
        )
        .map((entry) => entry.info.name),
    );

    logger.warn(
      `check-package-entrypoints: ${latentPackages.size} baselined package(s) point a resolved condition ("import"/"default" for Vite, "types" for NodeNext) at a gitignored build directory — latent, not failing. Re-run with --verbose to list them.`,
    );
  }

  const allErrors = [...errors, ...newOffenderErrors, ...staleBaselineErrors];

  if (allErrors.length > 0) {
    for (const error of allErrors) {
      logger.fail(`check-package-entrypoints: error: ${error}`);
    }
    logger.fail(
      `check-package-entrypoints: ${allErrors.length} violation(s) across ${packages.length} workspace package(s)`,
    );
    process.exit(1);
  }

  logger.success(
    `check-package-entrypoints: OK (${packages.length} workspace package(s), ${warnings.length} warning(s) across ${baseline.size} baselined package(s))`,
  );
};

run();
