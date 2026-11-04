/**
 * Repo-wide audit for the hook primitive shape
 * (docs/monorepo/hook-primitive-shape.md). Complements the
 * `openthrottle/hook-primitive-shape` ESLint rule, which owns the single-file
 * checks (H1 one hook named after the file, H2 exports, H3 module-scope values,
 * H4 markers, H5 return type). This script owns what ESLint cannot see:
 *
 *   - H6  the file name is camelCase `useFoo.ts(x)`, never kebab-case.
 *   - H6  an exported `use*` hook lives in a `hooks/` folder.
 *   - H3  a module-scope value declared in a `hooks/use*` file that some OTHER
 *         file imports belongs in `data/`, `config/` or `utils/` (cross-file).
 *
 * Usage: tsx ./scripts/audit-hook-shape.ts [--json] [--strict]
 *   --json    emit the violations as JSON.
 *   --strict  exit non-zero on a violation that is not in
 *             scripts/audit-hook-shape.allowlist.ts, and on an allowlist entry
 *             that no longer violates (delete it) — the list only shrinks.
 * Report-only (exit 0) otherwise.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { globSync } from 'glob';
import ts from 'typescript';

import type {
  HookShapeAllowlistEntry,
  HookShapeRule,
} from './audit-hook-shape.allowlist.ts';
import { HOOK_SHAPE_ALLOWLIST } from './audit-hook-shape.allowlist.ts';
import { createLogger } from './utils/index.ts';

const logger = createLogger();

const ROOT = process.cwd();

const IN_SCOPE_GLOBS = [
  'applications/*/app/**/*.{ts,tsx}',
  'packages/*/src/**/*.{ts,tsx}',
];

const EXCLUDE =
  /(?:\/dist\/|\/node_modules\/|\/__generated__\/|\/__tests__\/|\.d\.ts$|\.test\.tsx?$|\.stories\.tsx$|^packages\/react-router-shadcn\/)/;

/** A `/* hook-shape: opt-out — reason *\/` block comment on line 1. */
const OPT_OUT = /^\s*\/\*\s*hook-shape:\s*opt-out/;
const HOOK_NAME = /^use[A-Z]/;
const HOOK_FILE_NAME = /^use[A-Z][A-Za-z0-9]*$/;
const RESOLVE_SUFFIXES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

/** Marks an import that takes every export of the target (`export *`). */
const ALL_EXPORTS = '*';

export interface HookShapeViolation {
  readonly file: string;
  readonly message: string;
  readonly rule: HookShapeRule;
  readonly symbol: string | undefined;
}

export interface HookFileFacts {
  /** Exported `use*` bindings declared in the file. */
  readonly exportedHooks: readonly string[];
  /** Exported bindings declared in the file that are not hooks (candidates for H3). */
  readonly exportedValues: readonly string[];
  readonly file: string;
  readonly optOut: boolean;
}

const isInHooksFolder = (file: string): boolean =>
  file.split('/').slice(0, -1).includes('hooks');

const baseNameOf = (file: string): string =>
  path.basename(file).replace(/\.tsx?$/, '');

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind): boolean => {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;

  return modifiers?.some((m) => m.kind === kind) ?? false;
};

const parse = (file: string, content: string): ts.SourceFile =>
  ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

/** Names a statement declares at module scope, as `[name, isType]` pairs. */
const declaredNames = (
  statement: ts.Statement,
): readonly (readonly [string, boolean])[] => {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((decl) =>
      ts.isIdentifier(decl.name) ? [[decl.name.text, false] as const] : [],
    );
  }

  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name
  ) {
    return [[statement.name.text, false]];
  }

  if (
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement)
  ) {
    return [[statement.name.text, true]];
  }

  return [];
};

/**
 * Parse one file into the facts the checks need. Pure and content-based so it
 * is unit-testable without the filesystem.
 */
export const analyzeHookFileSource = (
  file: string,
  content: string,
): HookFileFacts => {
  const optOut = OPT_OUT.test(content.split('\n')[0] ?? '');
  const source = parse(file, content);

  const declared = new Map<string, boolean>();
  const exported = new Set<string>();

  for (const statement of source.statements) {
    const isExport = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);

    for (const [name, isType] of declaredNames(statement)) {
      declared.set(name, isType);
      if (isExport && !isDefault) exported.add(name);
    }

    // `export { a, b as c }` of local bindings (no module specifier).
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier === undefined &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause) &&
      !statement.isTypeOnly
    ) {
      for (const specifier of statement.exportClause.elements) {
        if (specifier.isTypeOnly) continue;
        exported.add((specifier.propertyName ?? specifier.name).text);
      }
    }
  }

  const exportedNames = [...exported]
    .filter((name) => declared.get(name) === false)
    .sort();

  return {
    exportedHooks: exportedNames.filter((name) => HOOK_NAME.test(name)),
    exportedValues: exportedNames.filter((name) => !HOOK_NAME.test(name)),
    file,
    optOut,
  };
};

/** One import of `names` from the module `specifier` made by `importer`. */
export interface ImportFact {
  readonly importer: string;
  readonly names: readonly string[];
  readonly specifier: string;
}

/** Every named import / re-export the file makes, as `ImportFact`s. */
export const collectImports = (
  file: string,
  content: string,
): readonly ImportFact[] => {
  const source = parse(file, content);
  const facts: ImportFact[] = [];

  const namespaceAccesses = (namespace: string): readonly string[] => {
    const names: string[] = [];
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === namespace
      ) {
        names.push(node.name.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);

    return names;
  };

  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings === undefined) continue;

      const names = ts.isNamedImports(bindings)
        ? bindings.elements.map((e) => (e.propertyName ?? e.name).text)
        : namespaceAccesses(bindings.name.text);

      facts.push({
        importer: file,
        names,
        specifier: statement.moduleSpecifier.text,
      });
      continue;
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const clause = statement.exportClause;
      const names =
        clause !== undefined && ts.isNamedExports(clause)
          ? clause.elements.map((e) => (e.propertyName ?? e.name).text)
          : [ALL_EXPORTS];

      facts.push({
        importer: file,
        names,
        specifier: statement.moduleSpecifier.text,
      });
    }
  }

  return facts;
};

/** Application root of a repo-relative path, for the `~/` alias. */
const appRootOf = (file: string): string | undefined => {
  const match = file.match(/^(applications\/[^/]+)\//);

  return match ? `${match[1]}/app` : undefined;
};

/**
 * Resolve an import specifier to an in-scope file, or undefined for a package
 * import or anything outside the scope. Handles relative paths (with the ESM
 * `.js`→`.ts` convention) and the apps' `~/` alias.
 */
export const resolveSpecifier = (
  importer: string,
  specifier: string,
  inScope: ReadonlySet<string>,
): string | undefined => {
  const base = specifier.startsWith('.')
    ? path.posix.join(path.posix.dirname(importer), specifier)
    : specifier.startsWith('~/')
      ? path.posix.join(appRootOf(importer) ?? '', specifier.slice(2))
      : undefined;

  if (base === undefined) return undefined;

  const stripped = base.replace(/\.(?:js|jsx)$/, '');
  const candidates = [base, stripped].flatMap((candidate) =>
    RESOLVE_SUFFIXES.map((suffix) => `${candidate}${suffix}`),
  );

  return candidates.find((candidate) => inScope.has(candidate));
};

/**
 * A "hook file" for the naming check: a file called `use*` that lives in a
 * `hooks/` folder (the ESLint rule's glob) or exports a `use*` hook. A file
 * that merely exports a hook next to other things (`chat-context.tsx`) is the
 * placement check's finding, not a bad name.
 */
const isHookFile = (facts: HookFileFacts): boolean =>
  baseNameOf(facts.file).startsWith('use') &&
  (isInHooksFolder(facts.file) || facts.exportedHooks.length > 0);

/** Compute every violation from the per-file facts and the import graph. */
export const findViolations = (
  facts: readonly HookFileFacts[],
  imports: readonly ImportFact[],
): readonly HookShapeViolation[] => {
  const violations: HookShapeViolation[] = [];
  const active = facts.filter((f) => !f.optOut);
  const inScope = new Set(facts.map((f) => f.file));

  // target file -> names imported by some other in-scope file.
  const importedBy = new Map<string, Map<string, Set<string>>>();
  for (const fact of imports) {
    const target = resolveSpecifier(fact.importer, fact.specifier, inScope);
    if (target === undefined || target === fact.importer) continue;

    const byName = importedBy.get(target) ?? new Map<string, Set<string>>();
    for (const name of fact.names) {
      const importers = byName.get(name) ?? new Set<string>();
      importers.add(fact.importer);
      byName.set(name, importers);
    }
    importedBy.set(target, byName);
  }

  for (const file of active) {
    const name = baseNameOf(file.file);

    // H6 — camelCase file name.
    if (isHookFile(file) && !HOOK_FILE_NAME.test(name)) {
      violations.push({
        file: file.file,
        message: `${path.basename(file.file)} is not camelCase useFoo.ts(x) — rename it (kebab-case is banned for hooks)`,
        rule: 'H6-file-name',
        symbol: undefined,
      });
    }

    // H6 — exported use* hook outside a hooks/ folder.
    if (file.exportedHooks.length > 0 && !isInHooksFolder(file.file)) {
      violations.push({
        file: file.file,
        message: `exports ${file.exportedHooks.join(', ')} outside a hooks/ folder — move each into the nearest sibling hooks/`,
        rule: 'H6-hook-outside-hooks',
        symbol: undefined,
      });
    }

    // H3 (cross-file) — a hook-file value some other file imports.
    if (isInHooksFolder(file.file) && name.startsWith('use')) {
      const byName = importedBy.get(file.file);
      const all = byName?.get(ALL_EXPORTS);

      for (const value of file.exportedValues) {
        const importers = new Set([
          ...(byName?.get(value) ?? []),
          ...(all ?? []),
        ]);
        if (importers.size === 0) continue;

        violations.push({
          file: file.file,
          message: `${value} is imported by ${[...importers].sort().join(', ')} — move it to data/, config/ or utils/`,
          rule: 'H3-imported-constant',
          symbol: value,
        });
      }
    }
  }

  return violations.sort((a, b) =>
    `${a.rule}|${a.file}|${a.symbol ?? ''}`.localeCompare(
      `${b.rule}|${b.file}|${b.symbol ?? ''}`,
    ),
  );
};

const keyOf = (entry: {
  readonly file: string;
  readonly rule: string;
  readonly symbol: string | undefined;
}): string => `${entry.rule}|${entry.file}|${entry.symbol ?? ''}`;

export interface StrictResult {
  /** Allowlist entries whose violation is gone — delete them. */
  readonly stale: readonly HookShapeAllowlistEntry[];
  /** Violations that are not allowlisted. */
  readonly unlisted: readonly HookShapeViolation[];
}

/** Compare the violations against the allowlist in both directions. */
export const checkAllowlist = (
  violations: readonly HookShapeViolation[],
  allowlist: readonly HookShapeAllowlistEntry[],
): StrictResult => {
  const allowed = new Set(allowlist.map(keyOf));
  const found = new Set(violations.map(keyOf));

  return {
    stale: allowlist.filter((entry) => !found.has(keyOf(entry))),
    unlisted: violations.filter((v) => !allowed.has(keyOf(v))),
  };
};

const readInScope = (): readonly { content: string; file: string }[] => {
  const files = IN_SCOPE_GLOBS.flatMap((pattern) =>
    globSync(pattern, { cwd: ROOT }),
  )
    .map((file) => file.split(path.sep).join('/'))
    .filter((file) => !EXCLUDE.test(file))
    .sort();

  return files.map((file) => ({
    content: readFileSync(path.join(ROOT, file), 'utf-8'),
    file,
  }));
};

const RULE_TITLES: Readonly<Record<HookShapeRule, string>> = {
  'H3-imported-constant':
    'H3 — hook-file values imported elsewhere (move to data/ or config/)',
  'H6-file-name': 'H6 — hook file name is not camelCase useFoo.ts(x)',
  'H6-hook-outside-hooks': 'H6 — exported use* hook outside a hooks/ folder',
};

const RULES = [
  'H6-file-name',
  'H6-hook-outside-hooks',
  'H3-imported-constant',
] as const satisfies readonly HookShapeRule[];

const run = (): void => {
  const json = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');

  const sources = readInScope();
  const facts = sources.map((s) => analyzeHookFileSource(s.file, s.content));
  const imports = sources.flatMap((s) => collectImports(s.file, s.content));
  const violations = findViolations(facts, imports);
  const result = checkAllowlist(violations, HOOK_SHAPE_ALLOWLIST);
  const failing = strict && (result.unlisted.length > 0 || result.stale.length > 0); // prettier-ignore

  if (json) {
    console.log(JSON.stringify(violations, null, 2));
    if (failing) process.exit(1);

    return;
  }

  const allowed = new Set(HOOK_SHAPE_ALLOWLIST.map(keyOf));

  logger.heading('Hook primitive-shape audit (H3 cross-file, H6)');
  logger.info(`Scanned ${facts.length} in-scope files.`);

  for (const rule of RULES) {
    const hits = violations.filter((v) => v.rule === rule);
    logger.blank();
    logger.info(`${RULE_TITLES[rule]}: ${hits.length}`);
    for (const hit of hits) {
      const tag = allowed.has(keyOf(hit)) ? ' [allowlisted]' : '';
      logger.detail(`${hit.file}${tag}  (${hit.message})`);
    }
  }

  const optOuts = facts.filter((f) => f.optOut);
  if (optOuts.length > 0) {
    logger.blank();
    logger.info(`Opt-out files (excluded): ${optOuts.length}`);
    for (const f of optOuts) logger.detail(f.file);
  }

  if (!strict) return;

  logger.blank();
  if (result.unlisted.length > 0) {
    logger.fail(`${result.unlisted.length} violation(s) not in the allowlist — fix them (do not add allowlist entries):`); // prettier-ignore
    for (const v of result.unlisted) {
      logger.detail(`${v.rule}  ${v.file}${v.symbol === undefined ? '' : `  ${v.symbol}`}`); // prettier-ignore
    }
  }

  if (result.stale.length > 0) {
    logger.fail(`${result.stale.length} stale allowlist entr(ies) — the violation is fixed, delete the entry from scripts/audit-hook-shape.allowlist.ts:`); // prettier-ignore
    for (const e of result.stale) {
      logger.detail(`${e.rule}  ${e.file}${e.symbol === undefined ? '' : `  ${e.symbol}`}`); // prettier-ignore
    }
  }

  if (failing) process.exit(1);

  logger.success(`Hook shape OK — ${HOOK_SHAPE_ALLOWLIST.length} allowlisted violation(s) remain.`); // prettier-ignore
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
