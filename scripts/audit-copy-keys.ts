/**
 * @description Repo-wide audit for dead copy (docs/monorepo/code-style.md, "Unused copy
 * keys"). Every `data/copy.ts` in a React Router app or `react-router-*`
 * package exports `as const` objects of user-facing strings. A key nothing
 * reads is dead copy that reviewers still have to read; ESLint cannot see it
 * because the reference lives in another file.
 *
 * A leaf key counts as used when a non-test source file reaches it through the
 * exported constant: `COPY.a.b`, `COPY.a['b']`, or a destructure of the group
 * that holds it. The check is conservative: a dynamic access (`COPY.a[status]`),
 * the constant or one of its groups used bare (passed, spread, aliased,
 * `typeof COPY`, `Object.entries(COPY.a)`) marks every key beneath that point
 * used.
 *
 * Usage: tsx ./scripts/audit-copy-keys.ts [--json] [--strict]
 *   --json    emit the unused keys as JSON.
 *   --strict  exit non-zero on an unused key that is not in
 *             scripts/audit-copy-keys.allowlist.ts, and on an allowlist entry
 *             that is no longer unused (delete it) — the list only shrinks.
 * Report-only (exit 0) otherwise.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { globSync } from 'glob';
import ts from 'typescript';

import { COPY_KEYS_ALLOWLIST } from './audit-copy-keys.allowlist.ts';
import { createLogger } from './utils/logger.ts';

const logger = createLogger();

const ROOT = process.cwd();

const COPY_FILE_GLOBS = [
  'applications/*/app/**/data/copy.ts',
  'packages/react-router-*/src/**/data/copy.ts',
];

const SOURCE_GLOBS = [
  'applications/*/{app,src}/**/*.{ts,tsx}',
  'packages/*/src/**/*.{ts,tsx}',
];

const EXCLUDE =
  /(?:\/dist\/|\/node_modules\/|\/__generated__\/|\/__tests__\/|\.d\.ts$|\.(?:test|spec)\.tsx?$)/;

/**
 * @description A leaf key's path inside one exported constant, e.g. `drawer.title`.
 */
export interface CopyLeaf {
  readonly constName: string;
  readonly keyPath: string;
}

/**
 * @description What one file reads from one exported constant.
 */
export interface CopyUsage {
  /** Leaf paths read exactly (`a.b`). */
  readonly exact: ReadonlySet<string>;
  /** Group paths used wholesale; every leaf at or beneath one is used. `''` is the whole constant. */
  readonly groups: ReadonlySet<string>;
}

export interface UnusedCopyKey {
  readonly constName: string;
  readonly file: string;
  readonly keyPath: string;
}

const parse = (file: string, content: string): ts.SourceFile => {
  return ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
};

const joinPath = (prefix: string, key: string): string => {
  return prefix === '' ? key : `${prefix}.${key}`;
};

/**
 * @description Strip `as const`, `satisfies T`, parentheses and `<T>` from an initializer.
 */
const unwrap = (expression: ts.Expression): ts.Expression => {
  if (
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    return unwrap(expression.expression);
  }

  return expression;
};

const staticKeyOf = (name: ts.PropertyName): string | undefined => {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  if (ts.isNumericLiteral(name)) return name.text;

  return undefined;
};

const collectObjectLeaves = (
  object: ts.ObjectLiteralExpression,
  prefix: string,
): readonly string[] => {
  return object.properties.flatMap((property): readonly string[] => {
    if (ts.isShorthandPropertyAssignment(property)) {
      return [joinPath(prefix, property.name.text)];
    }

    if (
      !ts.isPropertyAssignment(property) &&
      !ts.isMethodDeclaration(property)
    ) {
      return [];
    }

    const key = staticKeyOf(property.name);
    if (key === undefined) return [];

    const keyPath = joinPath(prefix, key);
    if (!ts.isPropertyAssignment(property)) return [keyPath];

    const value = unwrap(property.initializer);
    if (ts.isObjectLiteralExpression(value)) {
      return collectObjectLeaves(value, keyPath);
    }

    return [keyPath];
  });
};

/**
 * @description The leaf key paths of every exported `const X = { … }` in a copy file. Pure
 * and content-based so it is unit-testable without the filesystem.
 */
export const collectCopyLeaves = (
  file: string,
  content: string,
): readonly CopyLeaf[] => {
  const source = parse(file, content);

  return source.statements.flatMap((statement): readonly CopyLeaf[] => {
    if (!ts.isVariableStatement(statement)) return [];

    const isExported = ts
      .getModifiers(statement)
      ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (isExported !== true) return [];

    return statement.declarationList.declarations.flatMap((declaration) => {
      if (!ts.isIdentifier(declaration.name)) return [];
      if (declaration.initializer === undefined) return [];

      const value = unwrap(declaration.initializer);
      if (!ts.isObjectLiteralExpression(value)) return [];

      const constName = declaration.name.text;

      return collectObjectLeaves(value, '').map((keyPath) => ({
        constName,
        keyPath,
      }));
    });
  });
};

/**
 * @description Identifier positions that are not a read of the constant.
 */
const isNonReference = (node: ts.Identifier): boolean => {
  const parent = node.parent;
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent)) return true;
  if (ts.isExportSpecifier(parent)) return true;
  if (ts.isVariableDeclaration(parent) && parent.name === node) return true;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return true;
  }

  return ts.isPropertyAssignment(parent) && parent.name === node;
};

/**
 * @description The constant's own name plus any `import { X as Local }` alias in the file.
 */
const localNamesOf = (
  source: ts.SourceFile,
  constName: string,
): ReadonlySet<string> => {
  const names = new Set([constName]);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;

    for (const element of bindings.elements) {
      if (element.propertyName?.text === constName) {
        names.add(element.name.text);
      }
    }
  }

  return names;
};

const bindingKeyOf = (element: ts.BindingElement): string | undefined => {
  if (element.propertyName !== undefined) {
    return staticKeyOf(element.propertyName);
  }

  return ts.isIdentifier(element.name) ? element.name.text : undefined;
};

const bindingNames = (
  pattern: ts.ObjectBindingPattern,
  prefix: string,
  usage: { exact: Set<string>; groups: Set<string> },
): void => {
  for (const element of pattern.elements) {
    if (element.dotDotDotToken !== undefined) {
      usage.groups.add(prefix);
      continue;
    }

    const key = bindingKeyOf(element);
    if (key === undefined) {
      usage.groups.add(prefix);
      continue;
    }

    const keyPath = joinPath(prefix, key);
    if (ts.isObjectBindingPattern(element.name)) {
      bindingNames(element.name, keyPath, usage);
      continue;
    }

    usage.exact.add(keyPath);
    // A bound name is a leaf or a group; the audit cannot tell which here, so
    // it records both and lets leaf matching treat a group as wholesale.
    usage.groups.add(keyPath);
  }
};

/**
 * @description What a file reads from the constant `constName`. Walks each reference to the
 * identifier up through its static property chain.
 */
export const collectCopyUsage = (
  file: string,
  content: string,
  constName: string,
): CopyUsage => {
  const exact = new Set<string>();
  const groups = new Set<string>();
  if (!content.includes(constName)) return { exact, groups };

  const usage = { exact, groups };
  const source = parse(file, content);
  const localNames = localNamesOf(source, constName);
  const visit = (node: ts.Node): void => {
    if (
      ts.isIdentifier(node) &&
      localNames.has(node.text) &&
      !isNonReference(node)
    ) {
      let current: ts.Expression = node;
      let keyPath = '';

      // Climb `.a`, `['a']`, `?.a` while the key is static.
      for (;;) {
        const parent: ts.Node = current.parent;
        if (
          ts.isPropertyAccessExpression(parent) &&
          parent.expression === current
        ) {
          keyPath = joinPath(keyPath, parent.name.text);
          exact.add(keyPath);
          current = parent;
          continue;
        }

        if (
          ts.isElementAccessExpression(parent) &&
          parent.expression === current &&
          ts.isStringLiteralLike(parent.argumentExpression)
        ) {
          keyPath = joinPath(keyPath, parent.argumentExpression.text);
          exact.add(keyPath);
          current = parent;
          continue;
        }

        if (
          ts.isNonNullExpression(parent) ||
          ts.isParenthesizedExpression(parent)
        ) {
          current = parent;
          continue;
        }

        break;
      }

      const parent = current.parent;
      const isDestructured =
        ts.isVariableDeclaration(parent) &&
        parent.initializer === current &&
        ts.isObjectBindingPattern(parent.name);

      if (isDestructured) {
        bindingNames(parent.name, keyPath, usage);
      } else {
        // The path is a leaf read, or a group used wholesale (dynamic access,
        // alias, spread, argument): both mark the path and everything beneath it.
        exact.add(keyPath);
        groups.add(keyPath);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return usage;
};

const isCovered = (keyPath: string, usage: CopyUsage): boolean => {
  if (usage.exact.has(keyPath)) return true;

  for (const group of usage.groups) {
    if (group === '' || keyPath.startsWith(`${group}.`)) return true;
  }

  return false;
};

export interface CopySource {
  readonly content: string;
  readonly file: string;
}

/**
 * @description The leaf keys of `copyFile` that no file in `sources` reads. `sources` is
 * every non-test source file the constants could be read from.
 */
export const findUnusedCopyKeys = (
  copyFile: CopySource,
  sources: readonly CopySource[],
): readonly UnusedCopyKey[] => {
  const leaves = collectCopyLeaves(copyFile.file, copyFile.content);
  const constNames = [...new Set(leaves.map((leaf) => leaf.constName))];

  const usageByConst = new Map<string, readonly CopyUsage[]>(
    constNames.map((constName) => [
      constName,
      sources.map((source) => {
        return collectCopyUsage(source.file, source.content, constName);
      }),
    ]),
  );

  return leaves
    .filter((leaf) => {
      const usages = usageByConst.get(leaf.constName) ?? [];

      return !usages.some((usage) => isCovered(leaf.keyPath, usage));
    })
    .map((leaf) => ({ ...leaf, file: copyFile.file }));
};

export const entryOf = (key: UnusedCopyKey): string => {
  return `${key.file}::${key.constName}.${key.keyPath}`;
};

export interface StrictResult {
  /** Allowlist entries that are no longer unused — delete them. */
  readonly stale: readonly string[];
  /** Unused keys that are not allowlisted. */
  readonly unlisted: readonly UnusedCopyKey[];
}

/**
 * @description Compare the unused keys against the allowlist in both directions.
 */
export const checkAllowlist = (
  unused: readonly UnusedCopyKey[],
  allowlist: readonly string[],
): StrictResult => {
  const allowed = new Set(allowlist);
  const found = new Set(unused.map(entryOf));

  return {
    stale: allowlist.filter((entry) => !found.has(entry)),
    unlisted: unused.filter((key) => !allowed.has(entryOf(key))),
  };
};

const readGlobs = (patterns: readonly string[]): readonly CopySource[] => {
  const files = patterns
    .flatMap((pattern) => globSync(pattern, { cwd: ROOT }))
    .map((file) => file.split(path.sep).join('/'))
    .filter((file) => !EXCLUDE.test(file))
    .sort();

  return [...new Set(files)].map((file) => ({
    content: readFileSync(path.join(ROOT, file), 'utf-8'),
    file,
  }));
};

const run = (): void => {
  const json = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');

  const copyFiles = readGlobs(COPY_FILE_GLOBS);
  const sources = readGlobs(SOURCE_GLOBS);
  const unused = copyFiles.flatMap((copyFile) => {
    // A copy file may spread or reference its own sibling constants, so it
    // stays in the source set; only the declaration identifier is skipped.
    return findUnusedCopyKeys(copyFile, sources);
  });
  const result = checkAllowlist(unused, COPY_KEYS_ALLOWLIST);
  const failing = strict && (result.unlisted.length > 0 || result.stale.length > 0); // prettier-ignore

  if (json) {
    console.log(JSON.stringify(unused, null, 2));
    if (failing) process.exit(1);

    return;
  }

  const allowed = new Set(COPY_KEYS_ALLOWLIST);

  logger.heading('Unused copy-key audit');
  logger.info(`Scanned ${copyFiles.length} copy files against ${sources.length} source files.`); // prettier-ignore
  logger.info(`Unused keys: ${unused.length}`);
  for (const key of unused) {
    const tag = allowed.has(entryOf(key)) ? ' [allowlisted]' : '';
    logger.detail(`${key.file}  ${key.constName}.${key.keyPath}${tag}`);
  }

  if (!strict) return;

  logger.blank();
  if (result.unlisted.length > 0) {
    logger.fail(`${result.unlisted.length} unused copy key(s) not in the allowlist — delete them (do not add allowlist entries):`); // prettier-ignore
  }

  if (result.stale.length > 0) {
    logger.fail(`${result.stale.length} stale allowlist entr(ies) — the key is gone or used, delete the entry from scripts/audit-copy-keys.allowlist.ts:`); // prettier-ignore
    for (const entry of result.stale) logger.detail(entry);
  }

  if (failing) process.exit(1);

  logger.success(`Copy keys OK — ${COPY_KEYS_ALLOWLIST.length} allowlisted unused key(s) remain.`); // prettier-ignore
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
