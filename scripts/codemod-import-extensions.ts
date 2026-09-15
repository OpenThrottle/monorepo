/**
 * @description Rewrites extensionless relative import specifiers to the
 * `.ts`-suffixed form the workspace's ESM packages already use, so a project
 * can be flipped from `"type": "commonjs"` to `"type": "module"`.
 *
 * Under `module: nodenext` an extensionless relative specifier does not
 * resolve, so every `from './app.module'` in the CommonJS tier needs a suffix
 * before its package can be ESM. The target form is `from './app.module.ts'`,
 * relying on `allowImportingTsExtensions` + `rewriteRelativeImportExtensions`
 * (both already set in `tsconfig.base.json`) to emit `./app.module.js`. See
 * `packages/node-client/src` and `packages/nestjs-graphql/src` for the style.
 *
 * Lives in `scripts/` rather than `tools/` — the plan said `tools/` — because
 * its sibling is here: `check-nodenext-references.ts` guards the exact same
 * invariant (extensionless relative specifiers under NodeNext) from the
 * read-only side. Splitting a matched pair of tools across two trees to honour
 * a directory name would cost more than it buys.
 *
 * ## What it will not do
 *
 * Resolution is real, not textual. Every relative specifier is resolved against
 * the filesystem the way NodeNext would, and a specifier that resolves to
 * nothing is **reported and left alone** — never guessed at. A run that cannot
 * resolve something exits non-zero with the file and specifier named, because
 * silently skipping is how a half-migrated package ships.
 *
 * Untouched by design: bare package specifiers, `node:` builtins, anything
 * already carrying an extension (which makes the codemod idempotent), and
 * `.json` imports (`resolveJsonModule` handles those and the emit rewrite does
 * not apply to them).
 *
 * ## Usage
 *
 *   tsx ./scripts/codemod-import-extensions.ts                  # dry run, every nestjs project
 *   tsx ./scripts/codemod-import-extensions.ts --write          # apply
 *   tsx ./scripts/codemod-import-extensions.ts --project=packages/nestjs-redis
 *   tsx ./scripts/codemod-import-extensions.ts --json           # machine-readable report
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { Node, Project, SyntaxKind } from 'ts-morph';

import { flagValue, hasFlag } from './lib/args.ts';

/** A specifier the codemod could not resolve to a file on disk. */
export interface UnresolvedSpecifier {
  readonly file: string;
  readonly line: number;
  readonly specifier: string;
}

/** Per-project outcome of a dry run or an applied run. */
export interface ProjectReport {
  readonly filesChanged: number;
  readonly project: string;
  readonly rewritten: number;
  readonly scanned: number;
  readonly unresolved: readonly UnresolvedSpecifier[];
}

/** Extensions that mean "already suffixed"; seeing one makes the run a no-op. */
const RESOLVED_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json']; // prettier-ignore

/**
 * Resolve a relative specifier the way NodeNext would, returning the specifier
 * to write, or `null` when nothing on disk matches.
 *
 * Two shapes matter: a sibling module (`./foo` -> `./foo.ts`) and a directory
 * barrel (`./foo` where `foo/index.ts` exists -> `./foo/index.ts`). The
 * directory case is checked second so a file always wins over a same-named
 * directory, matching Node's own precedence.
 */
export const resolveSpecifier = (
  fromDirectory: string,
  specifier: string,
): string | null => {
  const target = path.resolve(fromDirectory, specifier);

  for (const extension of ['.ts', '.tsx']) {
    if (existsSync(`${target}${extension}`)) {
      return `${specifier}${extension}`;
    }
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    for (const extension of ['.ts', '.tsx']) {
      if (existsSync(path.join(target, `index${extension}`))) {
        return `${specifier.replace(/\/$/, '')}/index${extension}`;
      }
    }
  }

  return null;
};

/**
 * True when a specifier is a candidate for rewriting: relative, and not
 * already carrying an extension. Everything else — bare packages, `node:`
 * builtins, `.json`, already-suffixed paths — is left alone.
 */
export const needsExtension = (specifier: string): boolean => {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return false;
  }

  return !RESOLVED_EXTENSIONS.some((extension) =>
    specifier.endsWith(extension),
  );
};

/**
 * Every string-literal module specifier in a file: static `import`/`export`
 * declarations (which covers `import type`, `export * from` and re-exports)
 * plus dynamic `import()` calls.
 *
 * ts-morph is what makes this safe — a specifier inside a comment or a string
 * that merely looks like a path is not a node here, so it cannot be rewritten.
 */
const specifierNodes = (sourceFile: import('ts-morph').SourceFile) => {
  const declarations = [
    ...sourceFile.getImportDeclarations(),
    ...sourceFile.getExportDeclarations(),
  ].map((declaration) => declaration.getModuleSpecifier());

  const dynamic = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => call.getExpression().getKind() === SyntaxKind.ImportKeyword) // prettier-ignore
    .map((call) => call.getArguments()[0])
    .filter((argument) => argument !== undefined && Node.isStringLiteral(argument)); // prettier-ignore

  return [...declarations, ...dynamic].filter(
    (node) => node !== undefined && Node.isStringLiteral(node),
  );
};

/** Run the codemod over one project directory. */
export const codemodProject = (
  projectRoot: string,
  options: { readonly write: boolean },
): ProjectReport => {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    useInMemoryFileSystem: false,
  });

  project.addSourceFilesAtPaths([
    path.join(projectRoot, 'src/**/*.ts'),
    path.join(projectRoot, 'src/**/*.tsx'),
    path.join(projectRoot, 'tests/**/*.ts'),
    `!${path.join(projectRoot, '**/dist/**')}`,
    `!${path.join(projectRoot, '**/build/**')}`,
    `!${path.join(projectRoot, '**/node_modules/**')}`,
  ]);

  const sourceFiles = project.getSourceFiles();
  const unresolved: UnresolvedSpecifier[] = [];
  let rewritten = 0;
  let filesChanged = 0;

  for (const sourceFile of sourceFiles) {
    const directory = sourceFile.getDirectoryPath();
    let touched = false;

    for (const node of specifierNodes(sourceFile)) {
      if (node === undefined || !Node.isStringLiteral(node)) continue;

      const specifier = node.getLiteralValue();
      if (!needsExtension(specifier)) continue;

      const resolvedSpecifier = resolveSpecifier(directory, specifier);

      if (resolvedSpecifier === null) {
        unresolved.push({
          file: path.relative(process.cwd(), sourceFile.getFilePath()),
          line: node.getStartLineNumber(),
          specifier,
        });
        continue;
      }

      node.setLiteralValue(resolvedSpecifier);
      rewritten += 1;
      touched = true;
    }

    if (touched) {
      filesChanged += 1;
      if (options.write) sourceFile.saveSync();
    }
  }

  return {
    filesChanged,
    project: path.relative(process.cwd(), projectRoot),
    rewritten,
    scanned: sourceFiles.length,
    unresolved,
  };
};

/**
 * The projects this codemod targets: every workspace package or application
 * still declaring `"type": "commonjs"`. Derived from the manifests rather than
 * hardcoded, so the list shrinks on its own as packages are flipped and the
 * final run legitimately finds nothing left to do.
 */
export const findCommonjsProjects = (workspaceRoot: string): string[] => {
  const roots = ['applications', 'packages', 'tools'];
  const found: string[] = [];

  for (const root of roots) {
    const rootPath = path.join(workspaceRoot, root);
    if (!existsSync(rootPath)) continue;

    for (const entry of readdirSync(rootPath)) {
      const manifestPath = path.join(rootPath, entry, 'package.json');
      if (!existsSync(manifestPath)) continue;

      const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (
        typeof manifest === 'object' &&
        manifest !== null &&
        'type' in manifest &&
        manifest.type === 'commonjs'
      ) {
        found.push(path.join(rootPath, entry));
      }
    }
  }

  return found.sort();
};

const main = (): void => {
  const write = hasFlag('write');
  const json = hasFlag('json');
  const only = flagValue('project');
  const workspaceRoot = path.resolve(import.meta.dirname, '..');

  const projects =
    only === undefined
      ? findCommonjsProjects(workspaceRoot)
      : [path.resolve(workspaceRoot, only)];

  const reports = projects.map((projectRoot) =>
    codemodProject(projectRoot, { write }),
  );

  if (json) {
    console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', reports }, null, 2)); // prettier-ignore
  } else {
    const mode = write ? 'APPLYING' : 'DRY RUN (pass --write to apply)';
    console.log(`\n▶ Import-extension codemod — ${mode}\n`);

    const width = Math.max(...reports.map((r) => r.project.length), 7);
    for (const report of reports) {
      const suffix = report.unresolved.length > 0 ? `  ⚠️  ${report.unresolved.length} unresolved` : ''; // prettier-ignore
      console.log(
        `  ${report.project.padEnd(width)}  ${String(report.rewritten).padStart(5)} specifiers in ${report.filesChanged}/${report.scanned} files${suffix}`,
      );
    }

    const total = reports.reduce((sum, r) => sum + r.rewritten, 0);
    const files = reports.reduce((sum, r) => sum + r.filesChanged, 0);
    console.log(`\n  ${total} specifiers across ${files} files in ${reports.length} projects.\n`); // prettier-ignore
  }

  const unresolved = reports.flatMap((report) => report.unresolved);

  if (unresolved.length > 0) {
    console.error(`✖ ${unresolved.length} specifier(s) could not be resolved and were left unchanged:\n`); // prettier-ignore
    for (const entry of unresolved) {
      console.error(`   ${entry.file}:${entry.line}  '${entry.specifier}'`);
    }
    console.error('\n  Resolve these by hand, then re-run. The codemod is idempotent.\n'); // prettier-ignore
    process.exit(1);
  }
};

if (process.argv[1] !== undefined && import.meta.filename === process.argv[1]) {
  main();
}
