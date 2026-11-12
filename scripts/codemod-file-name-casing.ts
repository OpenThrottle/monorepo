/**
 * @description Renames single-export kebab-case files to their export's
 * casing (`get-form-field-kind.ts` → `getFormFieldKind.ts`) and rewrites every
 * reference to them across the workspace.
 *
 * The rule it applies is docs/monorepo/code-style.md § Naming conventions: a
 * file named for its single export takes that export's casing. This script is
 * the mechanical half of OT plan bc5f6aa0; the boundary it encodes is pinned
 * in that doc section, and the two must agree.
 *
 * ## What counts as in scope
 *
 * A file is a candidate when ALL of these hold:
 *
 * - It is `.ts` / `.tsx`, its stem has a hyphen, and the stem carries no other
 *   dotted segment than a `.server` / `.client` suffix. Any other dot means a
 *   form with its own rule (`<folder>.<kind>.ts`, `data.<name>.ts`,
 *   `mock.<name>.ts`, `*.test.ts`, `*.config.ts`, `*.d.ts`).
 * - It exports exactly one **value** (const, function, class, enum, or a
 *   named re-export). Type-only exports (interfaces, type aliases,
 *   `export type { … }`) do not count, so `useFoo` + `UseFooOptions` or a
 *   component + its props are still single-export.
 * - It has no `export *`, `export default`, `export =`, exported namespace or
 *   destructured export — any of those makes the export set unknowable here.
 * - It does not live under an excluded directory: React Router route modules
 *   (`app/routes/**`), `__generated__`, build output, or directly in a
 *   `scripts/` folder (entry points stay kebab-case; `scripts/utils/**` does
 *   not).
 *
 * The file takes the export's name exactly, even when the kebab stem said
 * something else (`form-field-kind.ts` exporting `getFormFieldKind` becomes
 * `getFormFieldKind.ts`) — that file→symbol mapping is the point of the rule.
 * Such renames are flagged `≠` in the report so a reviewer sees them.
 *
 * An ALL_CAPS constant (`CMS_STATUS`) is not a function or a component, so its
 * file keeps kebab-case and is reported as `constant`. Two candidates that
 * would land on the same name (case-insensitively — macOS is) are reported as
 * `conflict` and left alone.
 *
 * ## What moves with it
 *
 * Companion files sharing the stem move too: `get-foo.test.ts`,
 * `get-foo.stories.tsx`, `get-foo.tsx.graphql`, and `__tests__/get-foo.test.ts`
 * beside it.
 *
 * ## Reference rewriting
 *
 * Every string literal in a workspace TS/JS file whose value is a relative or
 * tsconfig-alias path (`~/…`, `@/…`) that resolves to a renamed file is
 * rewritten — import/export declarations, `import()`, `vi.mock(...)` and any
 * other call alike. The specifier keeps its extension form (none, `.ts`,
 * `.js`). Markdown/JSON/YAML files get their repo-relative path occurrences
 * rewritten; a bare basename left behind in one of those is reported, never
 * guessed at.
 *
 * ## Usage
 *
 *   tsx ./scripts/codemod-file-name-casing.ts --project=packages/react-router-ui            # dry run
 *   tsx ./scripts/codemod-file-name-casing.ts --project=packages/react-router-ui --write    # apply (git mv)
 *   tsx ./scripts/codemod-file-name-casing.ts --project=... --json                          # machine-readable
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'; // prettier-ignore
import path from 'node:path';

import ts from 'typescript';

import { flagValue, hasFlag } from './utils/args.ts';

/** Why a file is, or is not, renamed. */
export const RENAME_STATUS = {
  conflict: 'conflict',
  constant: 'constant',
  rename: 'rename',
} as const;

export type RenameStatus = (typeof RENAME_STATUS)[keyof typeof RENAME_STATUS];

/** One file the codemod looked at and would act on (or refused to). */
export interface RenameCandidate {
  readonly companions: readonly CompanionMove[];
  readonly exportName: string;
  readonly from: string;
  readonly status: RenameStatus;
  /** False when the rename also changes the name, not just its casing. */
  readonly stemMatches: boolean;
  readonly to: string;
}

/** A sibling file that moves because it shares the renamed file's stem. */
export interface CompanionMove {
  readonly from: string;
  readonly to: string;
}

/** A reference the codemod rewrote, or would rewrite on `--write`. */
export interface ReferenceEdit {
  readonly file: string;
  readonly from: string;
  readonly to: string;
}

/** A bare-basename mention in a non-code file the codemod did not touch. */
export interface StaleMention {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/** Outcome of one run. */
export interface CodemodReport {
  readonly candidates: readonly RenameCandidate[];
  readonly edits: readonly ReferenceEdit[];
  readonly project: string;
  readonly staleMentions: readonly StaleMention[];
}

/** The parsed result of counting a module's value exports. */
export type ExportScan =
  | { readonly kind: 'opaque'; readonly reason: string }
  | { readonly kind: 'values'; readonly names: readonly string[] };

/** Path segments that put a file out of scope wherever they appear. */
const EXCLUDED_SEGMENTS = new Set(['.react-router', '__generated__', 'build', 'coverage', 'dist', 'node_modules', 'storybook-static']); // prettier-ignore

/** Stem suffixes that survive the rename (`get-user.server.ts` → `getUser.server.ts`). */
const KEPT_SUFFIXES = ['.server', '.client'];

/** Extensions a module specifier may carry that still mean "this TS file". */
const SPECIFIER_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/** Code files scanned for references. */
const CODE_EXTENSIONS = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']); // prettier-ignore

/** Non-code files scanned for repo-relative path mentions. */
const TEXT_EXTENSIONS = new Set(['.json', '.md', '.mdx', '.yaml', '.yml']);

/** Directories never walked when collecting reference files. */
const WALK_SKIP = new Set(['.git', '.nx', '.react-router', '__generated__', 'build', 'coverage', 'dist', 'node_modules', 'storybook-static', 'test-results']); // prettier-ignore

/**
 * Split a file name into its stem, kept suffix and extension.
 *
 * @example splitFileName('get-user.server.ts') // { ext: '.ts', stem: 'get-user', suffix: '.server' }
 */
export const splitFileName = (
  fileName: string,
): { readonly ext: string; readonly stem: string; readonly suffix: string } => {
  const ext = path.extname(fileName);
  const withoutExt = fileName.slice(0, fileName.length - ext.length);
  const suffix = KEPT_SUFFIXES.find((kept) => withoutExt.endsWith(kept)) ?? '';
  const stem = withoutExt.slice(0, withoutExt.length - suffix.length);

  return { ext, stem, suffix };
};

/**
 * True when a workspace-relative path is a rename candidate by name and
 * location alone — before its exports are read.
 */
export const isInScopePath = (relativePath: string): boolean => {
  const segments = relativePath.split(path.sep).join('/').split('/');
  const fileName = segments[segments.length - 1] ?? '';
  const directories = segments.slice(0, -1);

  if (directories.some((segment) => EXCLUDED_SEGMENTS.has(segment))) {
    return false;
  }

  const routesIndex = directories.indexOf('routes');
  if (routesIndex > 0 && directories[routesIndex - 1] === 'app') {
    return false;
  }

  if (directories[directories.length - 1] === 'scripts') {
    return false;
  }

  const { ext, stem } = splitFileName(fileName);

  if (ext !== '.ts' && ext !== '.tsx') return false;
  if (stem.includes('.')) return false;

  return stem.includes('-');
};

/** True when a node carries the given modifier keyword. */
const hasModifier = (node: ts.Node, kind: ts.SyntaxKind): boolean => {
  if (!ts.canHaveModifiers(node)) return false;

  return (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind); // prettier-ignore
};

/**
 * Count a module's value exports, ignoring type-only ones. Anything that makes
 * the export set unknowable from the file alone is `opaque`.
 */
export const scanExports = (
  fileName: string,
  sourceText: string,
): ExportScan => {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, false); // prettier-ignore
  const names: string[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      return { kind: 'opaque', reason: 'export default / export =' };
    }

    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;

      const clause = statement.exportClause;
      if (clause === undefined || ts.isNamespaceExport(clause)) {
        return { kind: 'opaque', reason: 'export *' };
      }

      for (const element of clause.elements) {
        if (!element.isTypeOnly) names.push(element.name.text);
      }
      continue;
    }

    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;

    if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
      return { kind: 'opaque', reason: 'export default' };
    }

    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      continue;
    }

    if (ts.isModuleDeclaration(statement)) {
      return { kind: 'opaque', reason: 'exported namespace' };
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          return { kind: 'opaque', reason: 'destructured export' };
        }
        names.push(declaration.name.text);
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name !== undefined
    ) {
      names.push(statement.name.text);
    }
  }

  return { kind: 'values', names: [...new Set(names)] };
};

/** True when an export name is an ALL_CAPS constant (`CMS_STATUS`). */
export const isConstantName = (exportName: string): boolean => {
  return /^[A-Z][A-Z0-9_]*$/.test(exportName);
};

/** True when an export name is the stem with its casing changed. */
export const matchesStem = (stem: string, exportName: string): boolean => {
  return stem.replaceAll('-', '').toLowerCase() === exportName.toLowerCase();
};

/** The file name a candidate should take. */
export const targetFileName = (
  fileName: string,
  exportName: string,
): string => {
  const { ext, suffix } = splitFileName(fileName);

  return `${exportName}${suffix}${ext}`;
};

/** Every file under a directory, workspace-relative, skipping `WALK_SKIP`. */
const walk = (workspaceRoot: string, directory: string): string[] => {
  const absolute = path.join(workspaceRoot, directory);
  if (!existsSync(absolute)) return [];

  const found: string[] = [];

  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!WALK_SKIP.has(entry.name)) found.push(...walk(workspaceRoot, path.join(directory, entry.name))); // prettier-ignore
    } else if (entry.isFile()) {
      found.push(path.join(directory, entry.name));
    }
  }

  return found;
};

/** Siblings (and `__tests__/` neighbours) that share a file's stem. */
const findCompanions = (
  workspaceRoot: string,
  relativePath: string,
  newBase: string,
): CompanionMove[] => {
  const directory = path.dirname(relativePath);
  const { stem, suffix } = splitFileName(path.basename(relativePath));
  const oldBase = `${stem}${suffix}`;
  const ownName = path.basename(relativePath);
  const moves: CompanionMove[] = [];

  const collect = (folder: string): void => {
    const absolute = path.join(workspaceRoot, folder);
    if (!existsSync(absolute) || !statSync(absolute).isDirectory()) return;

    for (const name of readdirSync(absolute)) {
      if (folder === directory && name === ownName) continue;
      if (!name.startsWith(`${oldBase}.`)) continue;

      moves.push({
        from: path.join(folder, name),
        to: path.join(folder, `${newBase}${name.slice(oldBase.length)}`),
      });
    }
  };

  collect(directory);
  collect(path.join(directory, '__tests__'));

  return moves;
};

/**
 * The identity a file name collides on: lower-cased (macOS is case-insensitive)
 * and without a module extension, since `./doBar` would be ambiguous between
 * `doBar.ts` and `DoBar.tsx`.
 */
const collisionKey = (name: string): string => {
  return stripSpecifierExtension(name).toLowerCase();
};

/** True when a file colliding with `name` already exists in `directory`. */
const existsColliding = (absoluteDirectory: string, name: string): boolean => {
  if (!existsSync(absoluteDirectory)) return false;
  const key = collisionKey(name);

  return readdirSync(absoluteDirectory).some((entry) => collisionKey(entry) === key); // prettier-ignore
};

/** Find every rename the codemod would make in one project. */
export const planRenames = (
  workspaceRoot: string,
  projectDirectory: string,
): RenameCandidate[] => {
  const candidates: RenameCandidate[] = [];
  const claimed = new Set<string>();

  for (const relativePath of walk(workspaceRoot, projectDirectory).sort()) {
    if (!isInScopePath(relativePath)) continue;

    const absolute = path.join(workspaceRoot, relativePath);
    const scan = scanExports(absolute, readFileSync(absolute, 'utf8'));
    if (scan.kind === 'opaque' || scan.names.length !== 1) continue;

    const exportName = scan.names[0];
    if (exportName === undefined) continue;

    const fileName = path.basename(relativePath);
    const { stem, suffix } = splitFileName(fileName);
    const to = path.join(path.dirname(relativePath), targetFileName(fileName, exportName)); // prettier-ignore
    const companions = findCompanions(workspaceRoot, relativePath, `${exportName}${suffix}`); // prettier-ignore
    const targets = [to, ...companions.map((companion) => companion.to)];

    const collides = targets.some((target) => {
      return claimed.has(collisionKey(target)) || existsColliding(path.join(workspaceRoot, path.dirname(target)), path.basename(target)); // prettier-ignore
    });

    let status: RenameStatus = RENAME_STATUS.rename;
    if (isConstantName(exportName)) {
      status = RENAME_STATUS.constant;
    } else if (collides) {
      status = RENAME_STATUS.conflict;
    }

    if (status === RENAME_STATUS.rename) {
      for (const target of targets) claimed.add(collisionKey(target));
    }

    candidates.push({
      companions,
      exportName,
      from: relativePath,
      status,
      stemMatches: matchesStem(stem, exportName),
      to,
    });
  }

  return candidates;
};

/** A tsconfig `paths` alias, flattened to a prefix → absolute directory. */
interface PathAlias {
  readonly prefix: string;
  readonly target: string;
}

/**
 * The `~/*` / `@/*` style aliases a project's tsconfig files declare, keyed
 * by project root. Only the `X/*` → `./Y/*` shape is understood, which is the
 * only shape this workspace uses.
 */
export const readAliases = (
  workspaceRoot: string,
): Map<string, PathAlias[]> => {
  const byProject = new Map<string, PathAlias[]>();

  for (const area of ['applications', 'packages', 'tools']) {
    const areaPath = path.join(workspaceRoot, area);
    if (!existsSync(areaPath)) continue;

    for (const project of readdirSync(areaPath)) {
      const projectRoot = path.join(areaPath, project);
      if (!statSync(projectRoot).isDirectory()) continue;

      const aliases: PathAlias[] = [];
      for (const file of readdirSync(projectRoot).filter((name) =>
        /^tsconfig.*\.json$/.test(name),
      )) {
        // prettier-ignore
        const text = readFileSync(path.join(projectRoot, file), 'utf8');
        const parsed = ts.parseConfigFileTextToJson(file, text);
        const config: unknown = parsed.config;
        if (typeof config !== 'object' || config === null || !('compilerOptions' in config)) continue; // prettier-ignore

        const compilerOptions: unknown = config.compilerOptions;
        if (typeof compilerOptions !== 'object' || compilerOptions === null || !('paths' in compilerOptions)) continue; // prettier-ignore

        const paths: unknown = compilerOptions.paths;
        if (typeof paths !== 'object' || paths === null) continue;

        for (const [key, value] of Object.entries(paths)) {
          const first: unknown = Array.isArray(value) ? value[0] : undefined;
          if (!key.endsWith('/*') || typeof first !== 'string' || !first.endsWith('/*')) continue; // prettier-ignore

          aliases.push({
            prefix: key.slice(0, -1),
            target: path.resolve(projectRoot, first.slice(0, -1)),
          });
        }
      }

      if (aliases.length > 0) byProject.set(projectRoot, aliases);
    }
  }

  return byProject;
};

/** Strip a trailing module extension, if any. */
const stripSpecifierExtension = (value: string): string => {
  const ext = SPECIFIER_EXTENSIONS.find((candidate) =>
    value.endsWith(candidate),
  );

  return ext === undefined ? value : value.slice(0, -ext.length);
};

/**
 * Resolve a specifier written in `importerAbsolute` to an absolute path with
 * no extension, or `null` when it is not a relative or alias path.
 */
export const resolveSpecifierBase = (
  importerAbsolute: string,
  specifier: string,
  aliases: ReadonlyMap<string, readonly PathAlias[]>,
): string | null => {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return stripSpecifierExtension(path.resolve(path.dirname(importerAbsolute), specifier)); // prettier-ignore
  }

  for (const [projectRoot, projectAliases] of aliases) {
    if (!importerAbsolute.startsWith(`${projectRoot}${path.sep}`)) continue;

    for (const alias of projectAliases) {
      if (specifier.startsWith(alias.prefix)) {
        return stripSpecifierExtension(path.join(alias.target, specifier.slice(alias.prefix.length))); // prettier-ignore
      }
    }
  }

  return null;
};

/** Every string literal in a code file, with its position. */
const stringLiterals = (
  fileName: string,
  text: string,
): ts.StringLiteralLike[] => {
  const kind = fileName.endsWith('.tsx') || fileName.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS; // prettier-ignore
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind); // prettier-ignore
  const found: ts.StringLiteralLike[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteralLike(node)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return found;
};

/**
 * A global pattern matching `literal` only where it starts a path: not glued
 * to a preceding name character, dot, hyphen or slash, so `src/x.ts` does not
 * match inside `other/src/x.ts` and `status.ts` not inside `mcp-status.ts`.
 */
const boundedPattern = (literal: string): RegExp => {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`(?<![\\w./-])${escaped}`, 'g');
};

/** Rewrite references in code and text files. Returns the edits made. */
export const rewriteReferences = (
  workspaceRoot: string,
  renames: readonly RenameCandidate[],
  options: { readonly write: boolean },
): {
  readonly edits: ReferenceEdit[];
  readonly staleMentions: StaleMention[];
} => {
  const moves = renames.flatMap((candidate) => [{ from: candidate.from, to: candidate.to }, ...candidate.companions]); // prettier-ignore
  const byBase = new Map<string, string>();
  for (const move of moves) {
    byBase.set(stripSpecifierExtension(path.join(workspaceRoot, move.from)), stripSpecifierExtension(path.join(workspaceRoot, move.to))); // prettier-ignore
  }

  const oldStems = [...new Set(renames.map((candidate) => splitFileName(path.basename(candidate.from)).stem))]; // prettier-ignore
  const oldBasenames = new Set(moves.map((move) => path.basename(move.from)));
  const aliases = readAliases(workspaceRoot);
  const edits: ReferenceEdit[] = [];
  const staleMentions: StaleMention[] = [];

  const files = ['applications', 'packages', 'tools', 'scripts', 'docs', 'skills', 'databases']
    .flatMap((root) => walk(workspaceRoot, root))
    .concat(readdirSync(workspaceRoot).filter((name) => TEXT_EXTENSIONS.has(path.extname(name)))); // prettier-ignore

  for (const relativePath of files) {
    const ext = path.extname(relativePath);
    const isCode = CODE_EXTENSIONS.has(ext);
    if (!isCode && !TEXT_EXTENSIONS.has(ext)) continue;

    const absolute = path.join(workspaceRoot, relativePath);
    const text = readFileSync(absolute, 'utf8');
    if (!oldStems.some((stem) => text.includes(stem))) continue;

    let next = text;

    if (isCode) {
      const replacements: { readonly end: number; readonly start: number; readonly value: string }[] = []; // prettier-ignore

      for (const literal of stringLiterals(relativePath, text)) {
        const specifier = literal.text;
        const base = resolveSpecifierBase(absolute, specifier, aliases);
        if (base === null) continue;

        const newBase = byBase.get(base);
        if (newBase === undefined) continue;

        const specifierExt = specifier.slice(
          stripSpecifierExtension(specifier).length,
        );
        const head = stripSpecifierExtension(specifier);
        const rewritten = `${head.slice(0, head.length - path.basename(base).length)}${path.basename(newBase)}${specifierExt}`; // prettier-ignore
        const start = literal.getStart() + 1;
        replacements.push({
          end: start + specifier.length,
          start,
          value: rewritten,
        });
        edits.push({ file: relativePath, from: specifier, to: rewritten });
      }

      for (const replacement of replacements.sort(
        (a, b) => b.start - a.start,
      )) {
        next = `${next.slice(0, replacement.start)}${replacement.value}${next.slice(replacement.end)}`; // prettier-ignore
      }
    } else {
      const directory = path.dirname(relativePath);

      for (const move of moves) {
        // Repo-relative first, then relative to the doc itself — a package
        // AGENTS.md links `src/foo.ts`, not `packages/p/src/foo.ts`.
        const forms = [
          { from: move.from, to: move.to },
          { from: path.relative(directory, move.from), to: path.relative(directory, move.to) }, // prettier-ignore
        ];

        for (const form of forms) {
          const pattern = boundedPattern(form.from);
          if (!pattern.test(next)) continue;
          next = next.replace(pattern, () => form.to);
          edits.push({ file: relativePath, from: form.from, to: form.to });
        }
      }

      next.split('\n').forEach((line, index) => {
        for (const basename of oldBasenames) {
          if (boundedPattern(basename).test(line)) staleMentions.push({ file: relativePath, line: index + 1, text: line.trim() }); // prettier-ignore
        }
      });
    }

    if (options.write && next !== text) writeFileSync(absolute, next);
  }

  return { edits, staleMentions };
};

/** Apply the file moves with `git mv`, so history follows them. */
const applyMoves = (
  workspaceRoot: string,
  renames: readonly RenameCandidate[],
): void => {
  for (const candidate of renames) {
    for (const move of [
      { from: candidate.from, to: candidate.to },
      ...candidate.companions,
    ]) {
      execFileSync('git', ['mv', move.from, move.to], { cwd: workspaceRoot });
    }
  }
};

/** Run the codemod over one project directory. */
export const runCodemod = (
  workspaceRoot: string,
  projectDirectory: string,
  options: { readonly write: boolean },
): CodemodReport => {
  const candidates = planRenames(workspaceRoot, projectDirectory);
  const renames = candidates.filter((candidate) => candidate.status === RENAME_STATUS.rename); // prettier-ignore

  // References are rewritten before the moves so every importer is still
  // found under its old path; the moves then only touch the renamed files.
  const { edits, staleMentions } = rewriteReferences(workspaceRoot, renames, options); // prettier-ignore
  if (options.write) applyMoves(workspaceRoot, renames);

  return { candidates, edits, project: projectDirectory, staleMentions };
};

const main = (): void => {
  const project = flagValue('project');
  if (project === undefined) {
    console.error('✖ --project=<applications/… | packages/…> is required.');
    process.exit(2);
  }

  const workspaceRoot = path.resolve(import.meta.dirname, '..');
  const write = hasFlag('write');
  const report = runCodemod(workspaceRoot, project, { write });

  if (hasFlag('json')) {
    console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', report }, null, 2)); // prettier-ignore
    return;
  }

  console.log(`\n▶ File-name casing codemod — ${write ? 'APPLYING' : 'DRY RUN (pass --write to apply)'} — ${project}\n`); // prettier-ignore

  for (const status of [
    RENAME_STATUS.rename,
    RENAME_STATUS.constant,
    RENAME_STATUS.conflict,
  ]) {
    // prettier-ignore
    const group = report.candidates.filter((candidate) => candidate.status === status); // prettier-ignore
    if (group.length === 0) continue;

    console.log(`  ${status} (${group.length})`);
    for (const candidate of group) {
      const marker = candidate.stemMatches ? ' ' : '≠';
      const target = status === RENAME_STATUS.constant ? `keeps kebab-case (exports ${candidate.exportName})` : candidate.to; // prettier-ignore
      console.log(`  ${marker} ${candidate.from}  →  ${target}`);
      for (const companion of candidate.companions) console.log(`      + ${companion.from}  →  ${companion.to}`); // prettier-ignore
    }
    console.log('');
  }

  console.log(`  ${report.edits.length} reference(s) across ${new Set(report.edits.map((edit) => edit.file)).size} file(s).`); // prettier-ignore

  if (report.staleMentions.length > 0) {
    console.log(`\n  ⚠️  ${report.staleMentions.length} bare basename mention(s) in docs/config left as-is:`); // prettier-ignore
    for (const mention of report.staleMentions) console.log(`    ${mention.file}:${mention.line}  ${mention.text}`); // prettier-ignore
  }
  console.log('');
};

if (process.argv[1] !== undefined && import.meta.filename === process.argv[1]) {
  main();
}
