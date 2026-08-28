/**
 * Repo-wide audit for the route primitive shape
 * (docs/monorepo/route-primitive-shape.md). Complements the
 * `openthrottle/route-primitive-shape` ESLint rule, which owns the per-file
 * checks (R1 exports, R2 markers, R3 module-scope hoist) in `nx lint`/editor/CI.
 * This script is the repo-wide inventory + optional CI gate, mirroring
 * `audit-component-shape.ts`:
 *
 *   - R1  named value exports that are not part of the RR route surface.
 *   - R3  non-exported module-scope const/function helpers, config, and data.
 *   - R4  line count per route file (reported so the cap can be tuned).
 *
 * Usage: tsx ./scripts/audit-route-shape.ts [--json] [--strict]
 *   --json    emit the full inventory as JSON (for CI / the baseline).
 *   --strict  exit non-zero when any R1/R3 violation exists (the CI gate).
 * Report-only (exit 0) otherwise.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import ts from 'typescript';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();
const LINE_CAP = 210;
const IN_SCOPE_GLOBS = ['applications/*/app/routes/*.{ts,tsx}'];
const EXCLUDE = /(?:\/__tests__\/|\.test\.tsx?$|\/root\.tsx$)/;
const OPT_OUT = /route-shape:\s*opt-out/;

/** The React Router route module export surface (keep in sync with the rule). */
const ALLOWED_ROUTE_EXPORTS: ReadonlySet<string> = new Set([
  'ErrorBoundary',
  'HydrateFallback',
  'Layout',
  'action',
  'clientAction',
  'clientLoader',
  'clientMiddleware',
  'handle',
  'headers',
  'links',
  'loader',
  'meta',
  'middleware',
  'shouldRevalidate',
]);

interface FileReport {
  readonly disallowedExports: readonly string[];
  readonly file: string;
  readonly lineCount: number;
  readonly moduleScopeDecls: readonly string[];
  readonly optOut: boolean;
  readonly overCap: boolean;
  readonly project: string;
}

const projectOf = (relativePath: string): string => {
  const match = relativePath.match(/^(applications|packages)\/([^/]+)/);

  return match ? `${match[1]}/${match[2]}` : 'unknown';
};

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind): boolean => {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;

  return modifiers?.some((m) => m.kind === kind) ?? false;
};

const analyze = (absPath: string): FileReport => {
  const content = readFileSync(absPath, 'utf-8');
  const relativePath = path.relative(ROOT, absPath);
  const optOut = OPT_OUT.test(content.split('\n')[0] ?? '');

  const source = ts.createSourceFile(
    absPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const disallowedExports: string[] = [];
  const moduleScopeDecls: string[] = [];

  // First pass: the default-exported component identifier is never an R3 helper.
  let defaultComponentName: string | null = null;
  for (const statement of source.statements) {
    if (
      ts.isExportAssignment(statement) &&
      ts.isIdentifier(statement.expression)
    ) {
      defaultComponentName = statement.expression.text;
    }
  }

  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isExportAssignment(statement) ||
      ts.isExportDeclaration(statement)
    ) {
      continue;
    }

    const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);

    if (ts.isFunctionDeclaration(statement)) {
      if (isDefault) continue; // default export Component

      const name = statement.name?.text ?? '(anonymous)';
      if (exported) {
        if (!ALLOWED_ROUTE_EXPORTS.has(name)) disallowedExports.push(name);
      } else if (name !== defaultComponentName) {
        moduleScopeDecls.push(name);
      }
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;

        const name = decl.name.text;
        if (exported) {
          if (!ALLOWED_ROUTE_EXPORTS.has(name)) disallowedExports.push(name);
        } else if (name !== defaultComponentName) {
          moduleScopeDecls.push(name);
        }
      }
    }
  }

  const lineCount = content.split('\n').length;

  return {
    disallowedExports: optOut ? [] : disallowedExports,
    file: relativePath,
    lineCount,
    moduleScopeDecls: optOut ? [] : moduleScopeDecls,
    optOut,
    overCap: !optOut && lineCount > LINE_CAP,
    project: projectOf(relativePath),
  };
};

const hasViolation = (r: FileReport): boolean =>
  r.disallowedExports.length > 0 || r.moduleScopeDecls.length > 0;

const run = (): void => {
  const json = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');

  const files = IN_SCOPE_GLOBS.flatMap((pattern) =>
    globSync(pattern, { absolute: true, cwd: ROOT }),
  )
    .filter((file) => !EXCLUDE.test(file))
    .sort();

  const reports = files.map(analyze);

  if (json) {
    console.log(JSON.stringify(reports, null, 2));

    if (strict && reports.some(hasViolation)) process.exit(1);

    return;
  }

  const violations = reports.filter(hasViolation);
  const overCap = reports.filter((r) => r.overCap);
  const optOuts = reports.filter((r) => r.optOut);

  const byProject = new Map<string, number>();
  for (const r of violations) {
    byProject.set(r.project, (byProject.get(r.project) ?? 0) + 1);
  }

  logger.heading('Route primitive-shape audit (R1/R3/R4)');
  logger.info(`Scanned ${reports.length} route files.`);
  logger.blank();

  logger.info(
    `R1 — disallowed named value exports: ${
      violations.filter((r) => r.disallowedExports.length > 0).length
    } file(s)`,
  );

  for (const r of violations.filter((v) => v.disallowedExports.length > 0)) {
    logger.detail(`${r.file}  (${r.disallowedExports.join(', ')})`);
  }

  logger.blank();
  logger.info(
    `R3 — module-scope helpers/config/data to hoist: ${
      violations.filter((r) => r.moduleScopeDecls.length > 0).length
    } file(s)`,
  );

  for (const r of violations.filter((v) => v.moduleScopeDecls.length > 0)) {
    logger.detail(`${r.file}  (${r.moduleScopeDecls.join(', ')})`);
  }

  logger.blank();
  logger.info(`R4 — over the ${LINE_CAP}-line cap: ${overCap.length} file(s)`);

  for (const r of overCap.sort((a, b) => b.lineCount - a.lineCount)) {
    logger.detail(`${r.file}  (${r.lineCount})`);
  }

  logger.blank();
  logger.info('Violations by project (R1+R3):');
  for (const [project, count] of [...byProject.entries()].sort()) {
    logger.detail(`${project}: ${count}`);
  }

  if (optOuts.length > 0) {
    logger.blank();
    logger.info(`Opt-out files (excluded): ${optOuts.length}`);
    for (const r of optOuts) logger.detail(r.file);
  }

  if (strict && violations.length > 0) {
    logger.blank();
    logger.fail(
      `${violations.length} route(s) with R1/R3 violations — failing (--strict).`,
    );
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
