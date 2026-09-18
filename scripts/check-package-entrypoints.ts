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
 * **One severity: error.** Any of {@link RESOLVED_CONDITIONS} pointing into a
 * gitignored build directory fails the gate, `types` included. This rule has no
 * warn tier and no exemption list; the only exemption mechanism left anywhere in
 * the gate is {@link NESTJS_BLOCKERS}, which belongs to the separate
 * `technology:nestjs` invariant below and is empty.
 *
 * ## Why `types` errors, when the original rationale only covered runtime
 *
 * The gate shipped warn-mode with a shrink-only baseline of the 37 packages that
 * were already offending, and an error tier scoped to *runtime* conditions on a
 * package whose own `src/**` imports it by name — the one guaranteed break, since
 * a project's `test` target never depends on its own `build`. `types` sat at warn
 * because it could not inherit that argument: a mis-pointed `types` is `TS2305`
 * only for a consumer that holds no tsconfig project reference, and
 * `pnpm nx sync:check` now enforces reference parity for every in-workspace
 * project unconditionally. The residual risk is a *published* consumer — and
 * every package in this workspace is `private: true`, so that set is empty.
 *
 * So `types` is **not** promoted on the strength of its own hazard, and not on
 * symmetry either. It errors because the baseline reached zero. A package absent
 * from the baseline was always an error on any resolved condition; once the file
 * was empty every package was absent from it, and `types` had been erroring in
 * practice for as long as the population has been zero. Deleting the baseline
 * changed no verdict on any tree — it deleted the branch that could no longer
 * fire. The claim this gate makes is therefore narrower than "a mis-pointed
 * `types` breaks something": it is that a package contradicting itself — `main`
 * naming `src/` while a resolved condition names a build directory — is a defect
 * regardless of which consumer would notice first, and the workspace has already
 * paid down the entire population, so the cost of holding the line is zero.
 *
 * `importsItselfByName` survives as *diagnosis*, not severity. It no longer
 * decides whether a package fails — everything fails — and it is retained only to
 * tell an author whose test suite is already broken why, rather than leaving them
 * to discover the shard dependence themselves.
 *
 * Ignored directories are read from the real `.gitignore` via `git check-ignore`
 * rather than hardcoding `dist`, so a package that commits its build output is
 * not flagged.
 *
 * ## The `technology:nestjs` invariant
 *
 * Everything above decides, per package, which of two contradictory declarations
 * is the lie. For `technology:nestjs` packages that question is answered once, for
 * the whole tag, rather than per package: **they are built, never source-first.**
 *
 * NestJS is decorators and parameter properties, which Node's strip-only loader
 * rejects — but the rule deliberately does *not* scan for them. Construct-freedom
 * is not a stable property: a package named `nestjs-*` acquires its first
 * `@Injectable()` eventually, and nothing would catch the day it does. Worse, the
 * construct scan is only one of three conditions that must hold (no strip-only
 * constructs, no CommonJS `require()` chain reaching the package, no live build
 * target emitting declarations consumers read), and only the first is mechanically
 * checkable at all — `@openthrottle/nestjs-utils` passed the scan and still broke
 * 16 test projects through its consumer graph.
 *
 * So the tag carries the shape — built entry fields, no `exports` condition naming
 * source, and live `build` *and* `dev` targets — and
 * {@link collectNestjsViolations} enforces it from `package.json` alone. The exit is a single atomic flip of the whole tag
 * once NestJS supports ESM, not 26 independent re-litigations.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createLogger } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();
const WORKSPACE_DIRS = ['applications', 'packages', 'tools'] as const;

/**
 * @description The Nx tag that carries the built-not-source-first shape. See the
 * module JSDoc for why the rule is keyed on the tag rather than on a scan for
 * decorators and parameter properties.
 */
const NESTJS_TAG = 'technology:nestjs';

/**
 * @description Restricts the {@link NESTJS_TAG} rule to libraries. Applications
 * carry `technology:nestjs` too, but nothing imports an application by name, so
 * its `main` legitimately names its own source entry — `openthrottle-server`'s is
 * `./src/main.ts`.
 */
const PACKAGE_TAG = 'type:package';

/**
 * @description The live build target name. Source-first packages park theirs as
 * `__build`, so its absence is how a source-first package announces itself even
 * when its entry fields look right.
 */
const BUILD_TARGET = 'build';

/**
 * @description The live watch target name, parked as `__dev` the same way
 * {@link BUILD_TARGET} is. It is required alongside the build because
 * `openthrottle-server:dev` cascades `^dev` to its dependencies: a package with no
 * live `dev` gets no watcher, so editing it leaves the `dist/` its own entry
 * fields name stale while the server keeps serving the old build. Four of the five
 * packages missing this had been parked since the initial port rather than by any
 * decision.
 */
const DEV_TARGET = 'dev';

/**
 * @description The `technology:nestjs` packages that cannot satisfy the rule yet,
 * mapped to what blocks them. Their violations warn instead of erroring, and a
 * listed package that *stops* violating is itself an error, so the map can only
 * shrink and a stale entry can never quietly re-authorize a regression. This is
 * the last exemption mechanism left in the gate — the entrypoint baseline it was
 * modelled on reached zero and was deleted.
 *
 * **Currently empty, and that is the intended steady state.** It held
 * `@openthrottle/nestjs-agentic-workflow` until the two defects behind it were
 * fixed in `@openthrottle/openthrottle-agentic-ralph`: generated code emitting
 * `.js` specifiers for a source-first package, and a types-only import emitted as
 * a value import. Both are now prevented at the codegen config rather than per
 * package — see `@openthrottle/graphql-codegen`'s `importExtension` and
 * `useTypeImports`.
 *
 * This is not a place to park a package you did not want to fix. An entry needs a
 * concrete, named blocker that is someone else's work to land.
 */
const NESTJS_BLOCKERS: ReadonlyMap<string, string> = new Map();

/**
 * @description The `package.json` fields a consumer or bundler reads as the
 * package entry, in the order the remediation message lists them
 */
const ENTRY_FIELDS = ['main', 'module', 'types'] as const;

/**
 * @description Every condition a consumer resolves when importing a package by
 * name — `import`/`default` by Vite and Vitest, `types` by TypeScript under
 * NodeNext
 */
const RESOLVED_CONDITIONS = ['default', 'import', 'types'] as const;

/**
 * @description The subset of {@link RESOLVED_CONDITIONS} that decides whether
 * code *runs*. Only these can produce the shard-dependent test failure described
 * in the module JSDoc, so this no longer selects a severity — every resolved
 * condition errors — and serves only to decide whether an error message earns
 * that extra sentence of diagnosis.
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

interface NestjsReport {
  readonly errors: readonly string[];
  readonly scopedCount: number;
  readonly warnings: readonly string[];
}

interface EntryField {
  /** The `package.json` key, e.g. `main` */
  readonly field: string;
  /** Its declared value, e.g. `./dist/src/index.js` */
  readonly value: string;
}

interface PackageInfo {
  readonly directory: string;
  readonly entryFields: readonly EntryField[];
  readonly exportTargets: readonly ExportTarget[];
  readonly importsItselfByName: boolean;
  readonly main: string | undefined;
  readonly name: string;
  readonly tags: readonly string[];
  readonly targetNames: readonly string[];
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

/**
 * @description The Nx tags declared in a manifest's `nx.tags`, or none when the
 * manifest carries no inline Nx configuration
 */
const readTags = (parsed: Record<string, unknown>): readonly string[] => {
  if (!isRecord(parsed.nx) || !Array.isArray(parsed.nx.tags)) return [];

  return parsed.nx.tags.filter((tag): tag is string => typeof tag === 'string');
};

/**
 * @description The target names declared in a manifest's `nx.targets`. Only the
 * keys matter here — {@link BUILD_TARGET} is present or it is not.
 */
const readTargetNames = (
  parsed: Record<string, unknown>,
): readonly string[] => {
  if (!isRecord(parsed.nx) || !isRecord(parsed.nx.targets)) return [];

  return Object.keys(parsed.nx.targets);
};

const readPackageInfo = (directory: string): PackageInfo | undefined => {
  const manifestPath = path.join(directory, 'package.json');

  if (!existsSync(manifestPath)) return undefined;

  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!isRecord(parsed) || typeof parsed.name !== 'string') return undefined;

  const main = typeof parsed.main === 'string' ? parsed.main : undefined;
  const modulePath = typeof parsed.module === 'string' ? parsed.module : main;

  const entryFields = ENTRY_FIELDS.flatMap((field) => {
    const value = parsed[field];

    return typeof value === 'string' ? [{ field, value }] : [];
  });

  return {
    directory,
    entryFields,
    exportTargets: collectExportTargets(parsed.exports, '.', 'default'),
    importsItselfByName: importsSelfByName(directory, parsed.name),
    main: modulePath,
    name: parsed.name,
    tags: readTags(parsed),
    targetNames: readTargetNames(parsed),
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
 * @description True when a declared target names TypeScript source rather than
 * build output. Broader than {@link pointsAtSource}, which only recognises a
 * literal `src/` prefix and so misses a subpath map's `./*.ts`. Declarations
 * (`.d.ts`) are build output, not source.
 */
const namesTypeScriptSource = (entry: string | undefined): boolean =>
  entry !== undefined && /\.tsx?$/.test(entry) && !entry.endsWith('.d.ts');

/**
 * @description Enforces the blanket `technology:nestjs` shape — built entry
 * fields, no `exports` condition naming source, and a live build target. See the
 * module JSDoc for why this is keyed on the tag rather than measured per package.
 */
const collectNestjsViolations = (
  packages: readonly PackageInfo[],
): NestjsReport => {
  const scoped = packages.filter(
    (info) => info.tags.includes(NESTJS_TAG) && info.tags.includes(PACKAGE_TAG),
  );

  const violationsFor = (info: PackageInfo): readonly string[] => {
    const sourceFields = info.entryFields.filter((entry) =>
      namesTypeScriptSource(entry.value),
    );

    const sourceConditions = info.exportTargets.filter((entry) =>
      namesTypeScriptSource(entry.target),
    );

    const remediation =
      `Every "${NESTJS_TAG}" package is built, not source-first — the rule is keyed on the tag, so it holds regardless of whether this package happens to contain decorators or parameter properties today. ` +
      `Point main/module at ./dist/src/index.js, types at ./dist/src/index.d.ts, every "exports" condition at built output, and rename any "__build" placeholder back to "${BUILD_TARGET}". ` +
      `Source-first is the workspace default everywhere else, and this tier will NOT join it: Node's loader is strip-only, so decorators and constructor parameter properties require emitted code. That is a property of the loader, not of the module format — the tier moved to ESM in NestJS 12 and still cannot be source-first.`;

    const fieldViolation =
      sourceFields.length === 0
        ? []
        : [
            `${info.name}: ${sourceFields.map((entry) => `${entry.field} → ${entry.value}`).join(', ')} names TypeScript source. ${remediation}`,
          ];

    const conditionViolation =
      sourceConditions.length === 0
        ? []
        : [
            `${info.name}: ${sourceConditions.map((entry) => `exports["${entry.subpath}"].${entry.condition} → ${entry.target}`).join(', ')} names TypeScript source. ${remediation}`,
          ];

    const targetViolation = info.targetNames.includes(BUILD_TARGET)
      ? []
      : [
          `${info.name}: declares no live "${BUILD_TARGET}" target (has ${info.targetNames.length === 0 ? 'none' : info.targetNames.join(', ')}). ` +
            `A "${NESTJS_TAG}" package must emit the build its own entry fields name, or consumers resolve into a directory nothing populates. ${remediation}`,
        ];

    const devViolation = info.targetNames.includes(DEV_TARGET)
      ? []
      : [
          `${info.name}: declares no live "${DEV_TARGET}" target (has ${info.targetNames.length === 0 ? 'none' : info.targetNames.join(', ')}). ` +
            `"openthrottle-server:dev" cascades "^dev", so without one this package gets no watcher and the dist/ its own entry fields name goes stale under you while the server serves the old build. ` +
            `Rename the "__${DEV_TARGET}" placeholder back to "${DEV_TARGET}".`,
        ];

    return [
      ...fieldViolation,
      ...conditionViolation,
      ...targetViolation,
      ...devViolation,
    ];
  };

  const violating = new Set(
    scoped
      .filter((info) => violationsFor(info).length > 0)
      .map((info) => info.name),
  );

  // A blocker entry whose package now complies has to leave the map, or it
  // silently re-authorizes a regression in that package later.
  const staleBlockers = [...NESTJS_BLOCKERS.keys()]
    .filter((name) => !violating.has(name))
    .sort()
    .map(
      (name) =>
        `${name} is listed as a "${NESTJS_TAG}" blocker in ${path.basename(import.meta.filename)} but no longer violates the rule. ` +
        `Delete its NESTJS_BLOCKERS entry — the map is shrink-only.`,
    );

  return {
    errors: [
      ...scoped
        .filter((info) => !NESTJS_BLOCKERS.has(info.name))
        .flatMap(violationsFor),
      ...staleBlockers,
    ],
    scopedCount: scoped.length,
    warnings: scoped
      .filter((info) => NESTJS_BLOCKERS.has(info.name))
      .flatMap((info) =>
        violationsFor(info).map(
          (violation) =>
            `${violation} BLOCKED: ${NESTJS_BLOCKERS.get(info.name) ?? ''}`,
        ),
      ),
  };
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

  const offendingPackages = new Set(offenders.map((entry) => entry.info.name));

  // One error per offending package, not per condition: all of a package's
  // mis-pointed conditions are fixed by the same single edit to its `exports`
  // map, so reporting each one separately would multiply the output without
  // adding an action. The 37-package population this gate was built against
  // produced 151 condition-level warnings for exactly this reason.
  const errors = [...offendingPackages].sort().map((name) => {
    const entries = offenders.filter((entry) => entry.info.name === name);
    const first = entries[0];

    if (first === undefined) return name;

    // Retained as diagnosis only — see the module JSDoc. A self-importing
    // package is already failing its own test suite shard-dependently, and this
    // sentence is the difference between an author knowing why and not.
    const selfImport =
      first.info.importsItselfByName && entries.some(isRuntimeCondition)
        ? " This package's own src/ imports it by name, so its test target — which never depends on its own build — fails whenever no other project on the shard built it first."
        : '';

    return `${describe(first)}${selfImport}`;
  });

  const nestjs = collectNestjsViolations(packages);

  for (const warning of nestjs.warnings) {
    logger.warn(`check-package-entrypoints: warning: ${warning}`);
  }

  const allErrors = [...errors, ...nestjs.errors];

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
    `check-package-entrypoints: OK (${packages.length} workspace package(s), 0 mis-pointed condition(s), ${nestjs.scopedCount - NESTJS_BLOCKERS.size}/${nestjs.scopedCount} "${NESTJS_TAG}" package(s) built)`,
  );
};

run();
