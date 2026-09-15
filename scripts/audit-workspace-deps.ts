/**
 * Repo-wide audit for phantom dependencies: a project whose *source* imports a
 * package that its own `package.json` never declares.
 *
 * Two modes, one traversal. The default reports undeclared *workspace* siblings;
 * `--include-third-party` reports undeclared *third-party* packages instead.
 * Both resolve today only because the root `package.json` declares them, so pnpm
 * links them into the repo-root `node_modules/` and Node's resolution walks up
 * and finds them. Nothing in the importing project owns that resolution:
 * tighten root, change `node-linker`, or run a filtered `pnpm deploy`, and the
 * import breaks in a project nobody touched.
 *
 * The modes are deliberately disjoint — a workspace package is never a
 * third-party finding and vice versa — so the two gates can be adopted
 * independently without double-reporting.
 *
 * ## Why this is a script and not `@nx/dependency-checks`
 *
 * The repo already depends on `@nx/eslint-plugin`, and that rule answers a
 * superficially identical question. It was spiked and rejected (plan
 * 30ecd516): scoped to `**\/package.json` with `jsonc-eslint-parser` and
 * `buildTargets: ['typecheck']` it does find every undeclared sibling, but it
 * cannot be narrowed to *workspace* packages — `ignoredDependencies` is an
 * exact-match string list with no globs and no negation. Repo-wide it reports
 * 442 missing declarations and 59 obsolete ones across all 71 projects,
 * because it is accurately describing the entire root-hoisting surface rather
 * than the sibling-import drift this gate exists to stop.
 *
 * ## Scope
 *
 * Only *tracked* files are read (`git ls-files`), so gitignored build output is
 * excluded by construction rather than by a hardcoded `dist`/`build` list.
 * Three further exclusions, all verified non-defects:
 *
 *   - `__generated__` trees — committed codegen output, not authored source.
 *   - Tooling config at a project root (`eslint.config.*`, `vite.config.*`,
 *     `vitest.config.*`). 220 of these import `@tools/dotfiles`, which is a
 *     root dependency consumed by tooling and declared by exactly one non-root
 *     project.
 *   - `tools/generators/src/generators/*\/files/**` — scaffolding templates with
 *     `__name__` placeholders, emitted as text rather than compiled. Matches
 *     the existing eslint ignore in `tools/dotfiles/src/index.ts`.
 *
 * Third-party mode excludes two more classes, without which the report is
 * unusable:
 *
 *   - **Node builtins**, in both spellings — `path` and `node:path` alike.
 *     Read from `builtinModules` rather than a hardcoded list.
 *   - **tsconfig path aliases** (`~/*`, `@/*`), resolved against the
 *     *importing project's* tsconfig, following relative `extends` chains.
 *     They are declared per project — `tsconfig.base.json` has no `paths` key
 *     at all — so a new app's alias must not become a finding just because it
 *     is new.
 *
 * A deep specifier counts as an import of its package: `@import
 * '@openthrottle/react-router-shadcn/src/theme.css'` is a real use of
 * `@openthrottle/react-router-shadcn`. That deep-import pattern is the
 * established convention across the React Router apps and is not itself a
 * defect — but it obliges the app to declare the package.
 *
 * Usage: tsx ./scripts/audit-workspace-deps.ts [--include-third-party] [--json] [--strict]
 *   --include-third-party  audit third-party packages instead of workspace siblings.
 *   --json                 emit the findings as JSON.
 *   --strict               exit non-zero when any finding exists (the CI gate).
 * Report-only (exit 0) otherwise.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { createLogger, hasFlag } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();

/** Which half of the phantom-dependency surface a run reports. */
type AuditMode = 'third-party' | 'workspace';

/** Files whose imports are read. Anything else (JSON, MD, SQL) is skipped. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.cjs',
  '.css',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);

/**
 * Node's own modules, in both the bare (`path`) and prefixed (`node:path`)
 * spellings. Read from the running Node rather than hardcoded so the list
 * cannot go stale.
 */
const NODE_BUILTINS: ReadonlySet<string> = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

/**
 * Tooling config at a project root. These consume `@tools/dotfiles` by design —
 * it is a root dependency, and requiring 70 projects to redeclare it would be
 * noise, not a finding.
 */
const TOOLING_CONFIG = /^(?:eslint|prettier|vite|vitest)\.config\.[cm]?[jt]s$/;

/** The one package tooling config may consume without declaring it. */
const TOOLING_PACKAGE = '@tools/dotfiles';

/** Scaffolding templates, not compiled source. Mirrors the eslint ignore. */
const GENERATOR_TEMPLATES =
  /^tools\/generators\/src\/generators\/[^/]+\/files\//;

/**
 * Test files and test infrastructure, which argue for `devDependencies` rather
 * than `dependencies`. Beyond the obvious `__tests__/`, `tests/` and
 * `*.test.*` spellings this covers two shapes that are test-only in substance
 * but not in name:
 *
 *   - a project-root `vitest.setup.*`, which exists solely to configure the
 *     test run, and
 *   - a `testing/` directory, which holds fixtures imported only by tests.
 *
 * Without them a package whose sole use of `@testing-library/jest-dom` is its
 * own setup file would declare a test library as a production dependency.
 * Library source that happens to be *about* testing — `react-router-testing`,
 * `@tools/dotfiles` — is deliberately not matched: there those packages are
 * genuine runtime dependencies.
 */
const TEST_FILE =
  /(?:^|\/)(?:__tests__|tests|testing)\/|(?:^|\/)vitest\.setup\.[cm]?[jt]sx?$|\.(?:spec|test)\.[cm]?[jt]sx?$/;

/** A project-root tsconfig, whose `paths` declare that project's aliases. */
const TSCONFIG_FILE = /^tsconfig(?:\.[^/]+)?\.json$/;

/**
 * CSS `@import '...'`. TypeScript's own scanner handles every other file type;
 * a stylesheet has no `preProcessFile` equivalent.
 */
const CSS_IMPORT = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g;

/**
 * `vi.mock('pkg')` and friends. These are real module references — Vitest
 * resolves the specifier — but they are call arguments, so TypeScript's
 * `preProcessFile` does not report them.
 */
const MOCK_CALL = /\b(?:vi|jest)\.(?:do)?[mM]ock\s*\(\s*['"]([^'"]+)['"]/g;

/** How deep a relative `extends` chain is followed before giving up. */
const MAX_EXTENDS_DEPTH = 8;

interface WorkspaceProject {
  /**
   * tsconfig `paths` keys with any trailing `/*` stripped, e.g. `~` and `@`.
   * A specifier matching one of these resolves inside the project and is not a
   * package reference at all.
   */
  readonly aliasPrefixes: ReadonlySet<string>;
  /** Every dependency field merged — where the declaration is does not matter. */
  readonly declared: ReadonlySet<string>;
  /** Repo-relative project directory, e.g. `packages/react-router-auth`. */
  readonly directory: string;
  readonly name: string;
}

interface Finding {
  /** The dependency field the declaration belongs in. */
  readonly field: 'dependencies' | 'devDependencies';
  /** Repo-relative paths that import the package, for the report. */
  readonly files: readonly string[];
  /** The undeclared package. */
  readonly packageName: string;
  readonly project: string;
  readonly projectDirectory: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @description The workspace's project globs, read from `pnpm-workspace.yaml`
 * so a newly added tree (`databases/*`, say) is picked up without editing this
 * script. Only the flat `packages:` list is parsed — that is all it has ever
 * been.
 */
const workspaceGlobs = (): readonly string[] => {
  const contents = readFileSync(path.join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
  const lines = contents.split('\n');
  const start = lines.findIndex((line) => line.trimEnd() === 'packages:');

  if (start === -1) return [];

  const globs: string[] = [];

  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s+-\s*'?([^'"\s]+)'?\s*$/);

    if (match === null) break;

    const glob = match[1];

    if (glob !== undefined && !glob.startsWith('!')) globs.push(glob);
  }

  return globs;
};

const readDeclared = (manifest: Record<string, unknown>): ReadonlySet<string> =>
  new Set(
    [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies',
    ].flatMap((field) => {
      const value = manifest[field];

      return isRecord(value) ? Object.keys(value) : [];
    }),
  );

/**
 * @description A tsconfig parsed through TypeScript's own reader, so comments
 * and trailing commas — both present in this repo's configs — do not throw.
 */
const readTsconfig = (
  configPath: string,
): Record<string, unknown> | undefined => {
  if (!existsSync(configPath)) return undefined;

  const { config } = ts.parseConfigFileTextToJson(
    configPath,
    readFileSync(configPath, 'utf8'),
  );

  return isRecord(config) ? config : undefined;
};

/**
 * @description The alias prefixes one tsconfig contributes, following relative
 * `extends` so a project inherits a shared config's aliases. Only relative
 * extends are followed: a package-name extends would need node resolution, and
 * no config in this repo uses one to declare `paths`.
 */
const aliasPrefixesIn = (configPath: string, depth = 0): readonly string[] => {
  if (depth > MAX_EXTENDS_DEPTH) return [];

  const config = readTsconfig(configPath);

  if (config === undefined) return [];

  const { compilerOptions } = config;
  const own =
    isRecord(compilerOptions) && isRecord(compilerOptions.paths)
      ? Object.keys(compilerOptions.paths).map((key) =>
          key.replace(/\/\*$/, ''),
        )
      : [];

  const extended = config.extends;

  if (typeof extended !== 'string' || !extended.startsWith('.')) return own;

  const resolved = path.resolve(
    path.dirname(configPath),
    extended.endsWith('.json') ? extended : `${extended}.json`,
  );

  return [...own, ...aliasPrefixesIn(resolved, depth + 1)];
};

const readProject = (
  directory: string,
  tsconfigPaths: readonly string[],
): WorkspaceProject | undefined => {
  const manifestPath = path.join(ROOT, directory, 'package.json');

  if (!existsSync(manifestPath)) return undefined;

  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!isRecord(parsed) || typeof parsed.name !== 'string') return undefined;

  return {
    aliasPrefixes: new Set(
      tsconfigPaths.flatMap((tsconfigPath) =>
        aliasPrefixesIn(path.join(ROOT, tsconfigPath)),
      ),
    ),
    declared: readDeclared(parsed),
    directory,
    name: parsed.name,
  };
};

/**
 * @description Expands the workspace globs against tracked `package.json`
 * files. A glob here is only ever `dir/*` or a bare directory, so matching the
 * parent directory is enough — no glob library required.
 */
const listProjects = (
  manifestPaths: readonly string[],
  tsconfigPaths: readonly string[],
): readonly WorkspaceProject[] => {
  const globs = workspaceGlobs();

  const directories = manifestPaths
    .map((manifestPath) => path.posix.dirname(manifestPath))
    .filter((directory) =>
      globs.some((glob) =>
        glob.endsWith('/*')
          ? path.posix.dirname(directory) === glob.slice(0, -2)
          : directory === glob.replace(/\/$/, ''),
      ),
    );

  return directories
    .map((directory) =>
      readProject(
        directory,
        tsconfigPaths.filter(
          (tsconfigPath) => path.posix.dirname(tsconfigPath) === directory,
        ),
      ),
    )
    .filter((project): project is WorkspaceProject => project !== undefined);
};

/**
 * @description Every file git tracks, repo-relative and POSIX-separated. Using
 * the index rather than a directory walk means gitignored build output is
 * excluded by construction.
 */
const listTrackedFiles = (): readonly string[] =>
  execFileSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean);

const isScannable = (relativePath: string): boolean => {
  if (!SOURCE_EXTENSIONS.has(path.posix.extname(relativePath))) return false;

  return !GENERATOR_TEMPLATES.test(relativePath);
};

/**
 * @description Whether a package should be ignored in this particular file.
 * Tooling config at a project root consumes `@tools/dotfiles` by design — it is
 * a root dependency, and requiring 70 projects to redeclare it would be noise.
 * Previously the whole FILE was skipped for that one package's sake, which also
 * hid every other import a `vite.config.ts` makes (`@tailwindcss/vite`, plugins)
 * — a blind spot that only surfaced when root stopped carrying them.
 */
const isExemptInFile = (
  packageName: string,
  relativePath: string,
  projectDirectory: string,
): boolean =>
  packageName === TOOLING_PACKAGE &&
  TOOLING_CONFIG.test(relativePath.slice(projectDirectory.length + 1));

/**
 * @description The package a specifier names, or undefined when it names none.
 * A scoped name is its first two segments, an unscoped name its first — so deep
 * specifiers still resolve to their package.
 */
const packageOf = (specifier: string): string | undefined => {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return undefined;

  const segments = specifier.split('/');
  const candidate = specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];

  return candidate === undefined || candidate === '' ? undefined : candidate;
};

const matchesAlias = (
  specifier: string,
  aliasPrefixes: ReadonlySet<string>,
): boolean =>
  [...aliasPrefixes].some(
    (prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`),
  );

/**
 * @description Whether a specifier names a package this mode reports on.
 * Workspace mode wants siblings and nothing else; third-party mode wants
 * everything that is *not* a sibling, minus Node builtins, the importing
 * project's own tsconfig aliases, and non-package schemes such as
 * `virtual:` — none of which are npm packages at all.
 */
const isReportable = (
  specifier: string,
  packageName: string,
  mode: AuditMode,
  project: WorkspaceProject,
  workspaceNames: ReadonlySet<string>,
): boolean => {
  if (mode === 'workspace') return workspaceNames.has(packageName);

  if (workspaceNames.has(packageName)) return false;
  if (NODE_BUILTINS.has(specifier) || NODE_BUILTINS.has(packageName)) {
    return false;
  }
  if (packageName.includes(':')) return false;

  return !matchesAlias(specifier, project.aliasPrefixes);
};

/**
 * @description Every module specifier a file references. Scripts and modules go
 * through TypeScript's own pre-processor rather than a regex: a test that
 * asserts on generated template text contains a *string literal* holding an
 * import statement, and a regex cannot tell that apart from an import.
 */
const specifiersIn = (
  relativePath: string,
  contents: string,
): readonly string[] => {
  const matchAll = (pattern: RegExp): readonly string[] =>
    [...contents.matchAll(pattern)]
      .map((match) => match[1])
      .filter((specifier): specifier is string => specifier !== undefined);

  if (path.posix.extname(relativePath) === '.css') {
    return matchAll(CSS_IMPORT);
  }

  const preprocessed = ts.preProcessFile(contents, true, true);

  return [
    ...preprocessed.importedFiles.map((reference) => reference.fileName),
    // `/// <reference types="vite/client" />` resolves a package from
    // node_modules just as an import does, and is equally load-bearing.
    ...preprocessed.typeReferenceDirectives.map(
      (reference) => reference.fileName,
    ),
    ...matchAll(MOCK_CALL),
  ];
};

const importsIn = (
  relativePath: string,
  mode: AuditMode,
  project: WorkspaceProject,
  workspaceNames: ReadonlySet<string>,
): readonly string[] => {
  const contents = readFileSync(path.join(ROOT, relativePath), 'utf8');
  const found = new Set<string>();

  for (const specifier of specifiersIn(relativePath, contents)) {
    const packageName = packageOf(specifier);

    if (packageName === undefined) continue;
    if (!isReportable(specifier, packageName, mode, project, workspaceNames)) {
      continue;
    }

    found.add(packageName);
  }

  return [...found];
};

const audit = (mode: AuditMode): readonly Finding[] => {
  const trackedFiles = listTrackedFiles();

  const projects = listProjects(
    trackedFiles.filter((file) => path.posix.basename(file) === 'package.json'),
    trackedFiles.filter((file) =>
      TSCONFIG_FILE.test(path.posix.basename(file)),
    ),
  );

  const workspaceNames = new Set(projects.map((project) => project.name));

  // Longest directory first so a nested project claims its own files.
  const byDirectory = [...projects].sort(
    (a, b) => b.directory.length - a.directory.length,
  );

  const usage = new Map<string, Map<string, string[]>>();

  for (const file of trackedFiles) {
    const project = byDirectory.find((candidate) =>
      file.startsWith(`${candidate.directory}/`),
    );

    if (project === undefined) continue;
    if (!isScannable(file)) continue;

    for (const packageName of importsIn(file, mode, project, workspaceNames)) {
      if (packageName === project.name) continue;
      if (isExemptInFile(packageName, file, project.directory)) continue;
      if (project.declared.has(packageName)) continue;

      const forProject = usage.get(project.name) ?? new Map<string, string[]>();
      const files = forProject.get(packageName) ?? [];

      files.push(file);
      forProject.set(packageName, files);
      usage.set(project.name, forProject);
    }
  }

  return projects
    .flatMap((project) =>
      [...(usage.get(project.name) ?? new Map<string, string[]>())].map(
        ([packageName, files]): Finding => ({
          field: files.every((file) => TEST_FILE.test(file))
            ? 'devDependencies'
            : 'dependencies',
          files: [...files].sort(),
          packageName,
          project: project.name,
          projectDirectory: project.directory,
        }),
      ),
    )
    .sort(
      (a, b) =>
        a.projectDirectory.localeCompare(b.projectDirectory) ||
        a.packageName.localeCompare(b.packageName),
    );
};

/** Everything the report says that differs between the two modes. */
const COPY: Readonly<
  Record<
    AuditMode,
    Readonly<{
      fix: string;
      heading: string;
      noun: string;
      scriptName: string;
      subtitle: string;
    }>
  >
> = {
  'third-party': {
    fix: 'add "<package>": "catalog:" to the project manifest, then pnpm install  (NOT pnpm add <pkg>@catalog:, which rewrites the catalog)',
    heading: 'Third-party dependency audit',
    noun: 'third-party',
    scriptName: 'audit-third-party-deps',
    subtitle:
      'Source imports of a third-party package that the importing project does not declare.',
  },
  workspace: {
    fix: 'pnpm --filter <project> add <package>@workspace:^  (see the link-workspace-packages skill)',
    heading: 'Workspace dependency audit',
    noun: 'workspace',
    scriptName: 'audit-workspace-deps',
    subtitle:
      'Source imports of a sibling workspace package that the importing project does not declare.',
  },
};

const run = (): void => {
  const json = hasFlag('json');
  const strict = hasFlag('strict');
  const mode: AuditMode = hasFlag('include-third-party')
    ? 'third-party'
    : 'workspace';
  const copy = COPY[mode];
  const findings = audit(mode);

  if (json) {
    console.log(JSON.stringify(findings, null, 2));

    if (strict && findings.length > 0) process.exit(1);

    return;
  }

  logger.heading(copy.heading);
  logger.info(copy.subtitle);
  logger.blank();

  if (findings.length === 0) {
    logger.success(
      `${copy.scriptName}: OK — no undeclared ${copy.noun} imports.`,
    );

    return;
  }

  let currentProject = '';

  for (const finding of findings) {
    if (finding.project !== currentProject) {
      currentProject = finding.project;
      logger.info(`${finding.project}  (${finding.projectDirectory})`);
    }

    logger.detail(
      `${finding.packageName} → ${finding.field}  (${finding.files.length} file(s), e.g. ${finding.files[0]})`,
    );
  }

  logger.blank();

  const projectCount = new Set(findings.map((finding) => finding.project)).size;

  logger.info(
    `${findings.length} undeclared ${copy.noun} dependenc${
      findings.length === 1 ? 'y' : 'ies'
    } across ${projectCount} project(s).`,
  );
  logger.detail(`Fix with: ${copy.fix}`);

  if (strict) {
    logger.blank();
    logger.fail(
      `${findings.length} undeclared ${copy.noun} dependenc${
        findings.length === 1 ? 'y' : 'ies'
      } — failing (--strict).`,
    );
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
