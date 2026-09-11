/**
 * Repo-wide audit for phantom workspace dependencies: a project whose *source*
 * imports a sibling workspace package that its own `package.json` never
 * declares.
 *
 * These resolve today only because the root `package.json` declares every
 * workspace package, so pnpm links them into the repo-root `node_modules/` and
 * Node's resolution walks up and finds them. Nothing in the importing project
 * owns that resolution: tighten root, change `node-linker`, or run a filtered
 * `pnpm deploy`, and the import breaks in a project nobody touched.
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
 * A deep specifier counts as an import of its package: `@import
 * '@openthrottle/react-router-shadcn/src/theme.css'` is a real use of
 * `@openthrottle/react-router-shadcn`. That deep-import pattern is the
 * established convention across all four React Router apps and is not itself a
 * defect — but it obliges the app to declare the package.
 *
 * Usage: tsx ./scripts/audit-workspace-deps.ts [--json] [--strict]
 *   --json    emit the findings as JSON.
 *   --strict  exit non-zero when any finding exists (the CI gate).
 * Report-only (exit 0) otherwise.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { createLogger, hasFlag } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();

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
 * Tooling config at a project root. These consume `@tools/dotfiles` by design —
 * it is a root dependency, and requiring 70 projects to redeclare it would be
 * noise, not a finding.
 */
const TOOLING_CONFIG = /^(?:eslint|prettier|vite|vitest)\.config\.[cm]?[jt]s$/;

/** Scaffolding templates, not compiled source. Mirrors the eslint ignore. */
const GENERATOR_TEMPLATES =
  /^tools\/generators\/src\/generators\/[^/]+\/files\//;

/** Committed codegen output. */
const GENERATED = /(?:^|\/)__generated__\//;

/** Test files, which argue for `devDependencies` rather than `dependencies`. */
const TEST_FILE =
  /(?:^|\/)(?:__tests__|tests)\/|\.(?:spec|test)\.[cm]?[jt]sx?$/;

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

interface WorkspaceProject {
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
  /** The undeclared workspace package. */
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

const readProject = (directory: string): WorkspaceProject | undefined => {
  const manifestPath = path.join(ROOT, directory, 'package.json');

  if (!existsSync(manifestPath)) return undefined;

  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!isRecord(parsed) || typeof parsed.name !== 'string') return undefined;

  return {
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
    .map(readProject)
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

const isScannable = (
  relativePath: string,
  projectDirectory: string,
): boolean => {
  if (!SOURCE_EXTENSIONS.has(path.posix.extname(relativePath))) return false;
  if (GENERATED.test(relativePath)) return false;
  if (GENERATOR_TEMPLATES.test(relativePath)) return false;

  const withinProject = relativePath.slice(projectDirectory.length + 1);

  return !TOOLING_CONFIG.test(withinProject);
};

/**
 * @description The workspace package a specifier refers to, or undefined when
 * it refers to none. A scoped name is its first two segments, an unscoped name
 * its first — so deep specifiers still resolve to their package.
 */
const packageOf = (
  specifier: string,
  workspaceNames: ReadonlySet<string>,
): string | undefined => {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return undefined;

  const segments = specifier.split('/');
  const candidate = specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];

  return candidate !== undefined && workspaceNames.has(candidate)
    ? candidate
    : undefined;
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
    ...matchAll(MOCK_CALL),
  ];
};

const importsIn = (
  relativePath: string,
  workspaceNames: ReadonlySet<string>,
): readonly string[] => {
  const contents = readFileSync(path.join(ROOT, relativePath), 'utf8');
  const found = new Set<string>();

  for (const specifier of specifiersIn(relativePath, contents)) {
    const packageName = packageOf(specifier, workspaceNames);

    if (packageName !== undefined) found.add(packageName);
  }

  return [...found];
};

const audit = (): readonly Finding[] => {
  const trackedFiles = listTrackedFiles();

  const projects = listProjects(
    trackedFiles.filter((file) => path.posix.basename(file) === 'package.json'),
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
    if (!isScannable(file, project.directory)) continue;

    for (const packageName of importsIn(file, workspaceNames)) {
      if (packageName === project.name) continue;
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

const run = (): void => {
  const json = hasFlag('json');
  const strict = hasFlag('strict');
  const findings = audit();

  if (json) {
    console.log(JSON.stringify(findings, null, 2));

    if (strict && findings.length > 0) process.exit(1);

    return;
  }

  logger.heading('Workspace dependency audit');
  logger.info(
    'Source imports of a sibling workspace package that the importing project does not declare.',
  );
  logger.blank();

  if (findings.length === 0) {
    logger.success(
      'audit-workspace-deps: OK — no undeclared workspace imports.',
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
    `${findings.length} undeclared workspace dependenc${
      findings.length === 1 ? 'y' : 'ies'
    } across ${projectCount} project(s).`,
  );
  logger.detail(
    'Fix with: pnpm --filter <project> add <package>@workspace:^  (see the link-workspace-packages skill)',
  );

  if (strict) {
    logger.blank();
    logger.fail(
      `${findings.length} undeclared workspace dependenc${
        findings.length === 1 ? 'y' : 'ies'
      } — failing (--strict).`,
    );
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
