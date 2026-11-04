import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { describe, expect, test } from 'vitest';

/**
 * Generator templates are `.ts`/`.tsx` files that nothing in this repo
 * compiles: they are excluded from lint and typecheck (eslint reports them as
 * "ignored because of a matching ignore pattern"), knip ignores them by glob,
 * and no test imports them. A template can therefore reference an export that
 * its target package dropped months ago, and the failure lands on whoever next
 * runs the generator.
 *
 * That is exactly how the `form` template came to import a non-existent `Error`
 * from `@openthrottle/react-router-shadcn`. This guard closes that hole for the
 * export-drift class specifically.
 *
 * LIMITATION, stated plainly: this is a source-text parse of *names*. It
 * catches "this export no longer exists". It cannot catch prop-shape drift —
 * the same incident's second error was `Input` never having had the
 * `error`/`label` props the template passed, which is a type-level mismatch
 * this guard is blind to. Catching that needs a scaffold-and-typecheck smoke
 * rig; this is the cheap, deterministic majority that needs no scratch target.
 *
 * Everything here reads source off disk rather than importing the module:
 * `@tools/generators` must not take a runtime dependency on a React UI package
 * just to know what that package exports.
 */

const SHADCN_PACKAGE = '@openthrottle/react-router-shadcn';

/** Tried in order when resolving a relative specifier to a file on disk. */
const CANDIDATE_SUFFIXES: readonly string[] = [
  '.ts',
  '.tsx',
  '/index.ts',
  '/index.tsx',
];

/** `export const X`, `export async function X`, `export interface X`, … */
const RE_EXPORT_DECLARATION =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;

/** `export * from './x'` */
const RE_EXPORT_STAR = /^export\s*\*\s*from\s*['"]([^'"]+)['"]/gm;

/** `export { A, B as C }`, with or without a trailing `from './x'`. */
const RE_EXPORT_NAMED = /^export\s*\{([^}]*)\}\s*(?:from\s*['"][^'"]+['"])?/gm;

// `__dirname`, not `import.meta` — this package builds to CommonJS, which is
// also why the generators themselves resolve their template dirs this way.
const HERE = __dirname;
const TEMPLATE_ROOT = join(HERE, 'files');

const findWorkspaceRoot = (start: string): string => {
  let current = start;

  while (!existsSync(join(current, 'pnpm-workspace.yaml'))) {
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`Unable to locate pnpm-workspace.yaml above ${start}`);
    }
    current = parent;
  }

  return current;
};

const resolveSpecifier = (
  fromFile: string,
  specifier: string,
): string | undefined => {
  const base = resolve(dirname(fromFile), specifier);

  return CANDIDATE_SUFFIXES.map((suffix) => `${base}${suffix}`).find((path) =>
    existsSync(path),
  );
};

/**
 * Parses the exported names out of a re-export clause body: `A, B as C, type D`
 * yields `A`, `C`, `D` — the name a consumer imports, which for an aliased
 * export is the alias.
 */
const parseNamedClause = (clause: string): readonly string[] =>
  clause
    .split(',')
    .map((entry) => entry.trim().replace(/^type\s+/, ''))
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const parts = entry.split(/\s+as\s+/);
      return (parts[1] ?? parts[0] ?? '').trim();
    })
    .filter((name) => name.length > 0 && name !== 'default');

/** Every named export reachable from `entryFile`, following barrels. */
const collectModuleExports = (entryFile: string): ReadonlySet<string> => {
  const names = new Set<string>();
  const visited = new Set<string>();

  const visit = (file: string): void => {
    if (visited.has(file) || !existsSync(file)) return;
    visited.add(file);

    const source = readFileSync(file, 'utf8');

    for (const match of source.matchAll(RE_EXPORT_DECLARATION)) {
      if (match[1]) names.add(match[1]);
    }

    for (const match of source.matchAll(RE_EXPORT_NAMED)) {
      parseNamedClause(match[1] ?? '').forEach((name) => names.add(name));
    }

    for (const match of source.matchAll(RE_EXPORT_STAR)) {
      const specifier = match[1];
      if (!specifier || !specifier.startsWith('.')) continue;

      const resolved = resolveSpecifier(file, specifier);
      if (resolved) visit(resolved);
    }
  };

  visit(entryFile);

  return names;
};

const listTemplateFiles = (directory: string): readonly string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listTemplateFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });

/**
 * Named bindings of every `import … from '<shadcn>'` clause in a template.
 * Handles `import type` and multi-line clauses; a namespace or default import
 * has no names to check and is skipped.
 */
const parseShadcnImports = (source: string): readonly string[] => {
  const pattern = new RegExp(
    `import\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*['"]${SHADCN_PACKAGE}['"]`,
    'g',
  );

  return [...source.matchAll(pattern)].flatMap((match) =>
    (match[1] ?? '')
      .split(',')
      .map(
        (entry) =>
          entry
            .trim()
            .replace(/^type\s+/, '')
            .split(/\s+as\s+/)[0],
      )
      .filter((name): name is string => Boolean(name && name.length > 0)),
  );
};

describe('react-router generator templates — shadcn export drift', () => {
  const templates = listTemplateFiles(TEMPLATE_ROOT);
  const exported = collectModuleExports(
    join(findWorkspaceRoot(HERE), 'packages/react-router-shadcn/src/index.ts'),
  );

  test('the guard is actually pointed at something', () => {
    // A guard that silently matches zero files is worse than no guard.
    expect(templates.length).toBeGreaterThan(0);
    expect(exported.size).toBeGreaterThan(0);
    expect(exported.has('Input')).toBe(true);
    expect(exported.has('InlineErrors')).toBe(true);
    // Reached only by following a nested barrel, so this also proves the
    // `export * from` recursion works rather than stopping at the root index.
    expect(exported.has('DialogContent')).toBe(true);
  });

  test('the guard would have caught the export it was written for', () => {
    // `Error` is the import that broke the form template. If this ever starts
    // failing, shadcn grew an `Error` export and this assertion should go.
    expect(exported.has('Error')).toBe(false);
  });

  test('every shadcn name imported by a template is exported by shadcn', () => {
    const offenders = templates.flatMap((file) => {
      const names = parseShadcnImports(readFileSync(file, 'utf8'));
      return names
        .filter((name) => !exported.has(name))
        .map(
          (name) => `${file.replace(TEMPLATE_ROOT, 'files')} imports ${name}`,
        );
    });

    expect(offenders).toStrictEqual([]);
  });
});
