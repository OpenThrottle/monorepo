/**
 * Repo-wide audit for the component primitive shape
 * (docs/monorepo/component-primitive-shape.md). Complements the
 * `openthrottle/component-primitive-shape` ESLint rule, which owns the per-file
 * checks (R1 exports, R2 return type, R3 markers, R6 cap). This script owns the
 * cross-file dimensions ESLint can't see well and the repo-wide inventory:
 *
 *   - R4  file-scope helper functions / data / config that belong in the
 *         sibling utils/, data/, config/ folders (or a hooks/use<Name> hook).
 *   - R5  more than one exported component per file.
 *   - R6  line count per file (reported so the 210 cap can be tuned).
 *   - R7  advisory signals (useState / hook / statement counts) flagging
 *         components that should extract a use<Name> hook.
 *
 * Usage: tsx ./scripts/audit-component-shape.ts [--json] [--strict]
 *   --json    emit the full inventory as JSON (for CI / the baseline).
 *   --strict  exit non-zero when any R4/R5 violation exists (the CI gate).
 * Report-only (exit 0) otherwise.
 */

import path from 'node:path';
import ts from 'typescript';
import { createLogger } from './lib/index.ts';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import { readFileSync } from 'node:fs';

const logger = createLogger();

const ROOT = process.cwd();
const LINE_CAP = 210;

const IN_SCOPE_GLOBS = [
  'applications/*/app/**/components/**/*.tsx',
  'packages/*/src/**/components/**/*.tsx',
];

// The shadcn primitive variant (docs/monorepo/component-shape-shadcn-variant.md)
// lives in its own package and is excluded from the authored scan above.
const SHADCN_GLOB = 'packages/react-router-shadcn/src/**/components/**/*.tsx';
const SHADCN_EXCLUDE =
  /(?:\/dist\/|\/__generated__\/|\/__tests__\/|-test-utils\.tsx$|\.test\.tsx$|\.stories\.tsx$|\.example\.tsx$)/;

const EXCLUDE =
  /(?:\/dist\/|\/__generated__\/|\/__tests__\/|\.test\.tsx$|\.server\.tsx$|\.stories\.tsx$|\.example\.tsx$|packages\/react-router-shadcn\/)/;

const OPT_OUT = /component-shape:\s*opt-out/;

interface FileReport {
  readonly dataDecls: number;
  readonly exportedComponents: number;
  readonly file: string;
  readonly helperDecls: number;
  readonly hookCalls: number;
  readonly lineCount: number;
  readonly optOut: boolean;
  readonly overCap: boolean;
  readonly project: string;
  readonly statements: number;
  readonly useStateCount: number;
}

const projectOf = (relativePath: string): string => {
  const match = relativePath.match(/^(applications|packages)\/([^/]+)/);
  return match ? `${match[1]}/${match[2]}` : 'unknown';
};

const isPascalCase = (name: string): boolean => /^[A-Z]/.test(name);

const initFunction = (
  init: ts.Expression | undefined,
): ts.ArrowFunction | ts.FunctionExpression | undefined => {
  if (init === undefined) return undefined;
  if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return init;

  // Unwrap memo(...) / forwardRef(...) / React.memo(...).
  if (ts.isCallExpression(init) && init.arguments.length > 0) {
    const first = init.arguments[0];
    if (ts.isArrowFunction(first) || ts.isFunctionExpression(first)) {
      return first;
    }
  }

  return undefined;
};

const isExported = (node: ts.Node): boolean => {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;

  return (
    modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
  );
};

const countHookSignals = (
  fn: ts.ArrowFunction | ts.FunctionExpression,
): { hookCalls: number; statements: number; useStateCount: number } => {
  let hookCalls = 0;
  let useStateCount = 0;
  const statements =
    fn.body && ts.isBlock(fn.body) ? fn.body.statements.length : 0;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const text = ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : ts.isIdentifier(callee)
          ? callee.text
          : '';

      if (/^use[A-Z]/.test(text)) hookCalls += 1;
      if (text === 'useState') useStateCount += 1;
    }

    ts.forEachChild(node, visit);
  };

  visit(fn);

  return { hookCalls, statements, useStateCount };
};

const analyze = (absPath: string): FileReport | null => {
  let content: string;
  try {
    content = readFileSync(absPath, 'utf-8');
  } catch {
    return null;
  }

  const relativePath = path.relative(ROOT, absPath);
  const optOut = OPT_OUT.test(content.split('\n')[0] ?? '');

  const source = ts.createSourceFile(
    absPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  let exportedComponents = 0;
  let helperDecls = 0;
  let dataDecls = 0;
  let componentFn: ts.ArrowFunction | ts.FunctionExpression | undefined;

  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      // A module-scope function that is not the component is a helper (R4).
      if (isPascalCase(statement.name.text)) {
        exportedComponents += isExported(statement) ? 1 : 0;
      } else {
        helperDecls += 1;
      }
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;

    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;

      const name = decl.name.text;
      const fn = initFunction(decl.initializer);

      if (fn && isPascalCase(name)) {
        if (isExported(statement)) exportedComponents += 1;
        componentFn = componentFn ?? fn;
        continue;
      }

      if (fn && !name.startsWith('use')) {
        helperDecls += 1;
        continue;
      }

      if (
        decl.initializer &&
        (ts.isArrayLiteralExpression(decl.initializer) ||
          ts.isObjectLiteralExpression(decl.initializer))
      ) {
        dataDecls += 1;
      }
    }
  }

  const lineCount = content.split('\n').length;
  const signals = componentFn
    ? countHookSignals(componentFn)
    : { hookCalls: 0, statements: 0, useStateCount: 0 };

  return {
    dataDecls,
    exportedComponents,
    file: relativePath,
    helperDecls,
    hookCalls: signals.hookCalls,
    lineCount,
    optOut,
    overCap: lineCount > LINE_CAP,
    project: projectOf(relativePath),
    statements: signals.statements,
    useStateCount: signals.useStateCount,
  };
};

/** True when an initializer is a `forwardRef(...)` / `React.forwardRef(...)` call. */
const isForwardRefInit = (init: ts.Expression | undefined): boolean => {
  if (init === undefined || !ts.isCallExpression(init)) return false;

  const callee = init.expression;
  if (ts.isIdentifier(callee)) return callee.text === 'forwardRef';
  if (ts.isPropertyAccessExpression(callee)) {
    return callee.name.text === 'forwardRef';
  }

  return false;
};

/**
 * Report for one shadcn primitive file (the variant profile). Pure and
 * content-based so it is unit-testable without the filesystem. Mirrors the
 * `component-primitive-shape` ESLint rule's `primitive` profile so the audit
 * and the rule can't disagree.
 */
export interface PrimitiveReport {
  readonly file: string;
  readonly forwardRefParts: readonly string[];
  readonly lineCount: number;
  readonly missingDisplayName: readonly string[];
  readonly missingProps: readonly string[];
  readonly optOut: boolean;
  readonly overCap: boolean;
  readonly parts: readonly string[];
  readonly reExportBlock: boolean;
}

/**
 * Analyze one shadcn primitive source: its exported PascalCase parts, which are
 * `forwardRef`, which lack a paired `<Part>Props` (VR1) or a `displayName`
 * (VR2), and whether it uses the banned trailing `export { … }` block (VR5).
 */
export const analyzePrimitiveSource = (
  content: string,
  file = 'primitive.tsx',
): PrimitiveReport => {
  const optOut = OPT_OUT.test(content.split('\n')[0] ?? '');
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const parts: string[] = [];
  const forwardRefParts: string[] = [];
  const exportedInterfaces = new Set<string>();
  const displayNames = new Set<string>();
  let reExportBlock = false;

  for (const statement of source.statements) {
    // Exported interface names.
    // An exported `<Part>Props` — interface, or a `type` alias for union-props
    // primitives (VR1 accepts both in the primitive profile).
    if (ts.isInterfaceDeclaration(statement) && isExported(statement)) {
      exportedInterfaces.add(statement.name.text);
      continue;
    }

    if (ts.isTypeAliasDeclaration(statement) && isExported(statement)) {
      exportedInterfaces.add(statement.name.text);
      continue;
    }

    // `<Name>.displayName = …` assignments.
    if (
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression) &&
      statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(statement.expression.left) &&
      statement.expression.left.name.text === 'displayName' &&
      ts.isIdentifier(statement.expression.left.expression)
    ) {
      displayNames.add(statement.expression.left.expression.text);
      continue;
    }

    // The banned trailing `export { … }` re-export block (no module specifier).
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause) &&
      statement.moduleSpecifier === undefined
    ) {
      reExportBlock = true;
      continue;
    }

    // Exported PascalCase const parts.
    if (!ts.isVariableStatement(statement) || !isExported(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;

      const name = decl.name.text;
      if (!isPascalCase(name) || initFunction(decl.initializer) === undefined) {
        continue;
      }

      parts.push(name);

      if (isForwardRefInit(decl.initializer)) forwardRefParts.push(name);
    }
  }

  const lineCount = content.split('\n').length;
  return {
    file,
    forwardRefParts,
    lineCount,
    missingDisplayName: optOut
      ? []
      : forwardRefParts.filter((p) => !displayNames.has(p)),
    missingProps: optOut
      ? []
      : parts.filter((p) => !exportedInterfaces.has(`${p}Props`)),
    optOut,
    overCap: !optOut && lineCount > LINE_CAP,
    parts,
    reExportBlock: !optOut && reExportBlock,
  };
};

const runShadcn = (): void => {
  const files = globSync(SHADCN_GLOB, { absolute: true, cwd: ROOT })
    .filter((file) => !SHADCN_EXCLUDE.test(file))
    .sort();

  const reports = files.map((abs) =>
    analyzePrimitiveSource(
      readFileSync(abs, 'utf-8'),
      path.relative(ROOT, abs),
    ),
  );

  const totalParts = reports.reduce((n, r) => n + r.parts.length, 0);
  const totalForwardRef = reports.reduce(
    (n, r) => n + r.forwardRefParts.length,
    0,
  );

  const missingProps = reports.filter((r) => r.missingProps.length > 0);
  const missingDisplay = reports.filter((r) => r.missingDisplayName.length > 0);
  const reExport = reports.filter((r) => r.reExportBlock);
  const overCap = reports.filter((r) => r.overCap);
  const optOuts = reports.filter((r) => r.optOut);

  logger.heading('shadcn primitive-variant audit (VR1/VR2/VR5/VR6) — report-only'); // prettier-ignore
  logger.info(
    `Scanned ${reports.length} files, ${totalParts} exported parts (${totalForwardRef} forwardRef).`,
  );
  logger.blank();

  logger.info(
    `VR1 — parts missing a <Part>Props: ${missingProps.length} file(s)`,
  );

  for (const r of missingProps) {
    logger.detail(`${r.file}  (${r.missingProps.join(', ')})`);
  }

  logger.blank();
  logger.info(
    `VR2 — forwardRef parts missing displayName: ${missingDisplay.length} file(s)`,
  );
  for (const r of missingDisplay) {
    logger.detail(`${r.file}  (${r.missingDisplayName.join(', ')})`);
  }

  logger.blank();
  logger.info(
    `VR5 — banned trailing \`export { … }\` block: ${reExport.length} file(s)`,
  );
  for (const r of reExport) logger.detail(r.file);

  logger.blank();
  logger.info(`VR6 — over the ${LINE_CAP}-line cap: ${overCap.length} file(s)`);
  for (const r of overCap.sort((a, b) => b.lineCount - a.lineCount)) {
    logger.detail(`${r.file}  (${r.lineCount})`);
  }

  if (optOuts.length > 0) {
    logger.blank();
    logger.info(`Opt-out files (excluded): ${optOuts.length}`);
    for (const r of optOuts) logger.detail(r.file);
  }

  // In --strict mode the structural VRs (VR1 props, VR2 displayName, VR5
  // re-export block) gate the build; VR6 (over-cap) stays report-only, since a
  // few compound families sit over 210 by design (max-lines is off for shadcn).
  if (process.argv.includes('--strict')) {
    const structural =
      missingProps.length + missingDisplay.length + reExport.length;
    if (structural > 0) {
      logger.blank();
      logger.fail(
        `${structural} structural VR1/VR2/VR5 violation(s) — failing (--strict).`,
      );
      process.exit(1);
    }
  }
};

const hasHoistViolation = (r: FileReport): boolean =>
  !r.optOut && (r.helperDecls > 0 || r.dataDecls > 0);
const hasMultiComponent = (r: FileReport): boolean =>
  !r.optOut && r.exportedComponents > 1;
const isHookHeavy = (r: FileReport): boolean =>
  !r.optOut && (r.useStateCount >= 8 || r.statements >= 30);

const run = (): void => {
  // The shadcn primitive-variant profile is a separate, report-only scan.
  if (process.argv.includes('--shadcn')) {
    runShadcn();
    return;
  }

  const json = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');

  const files = IN_SCOPE_GLOBS.flatMap((pattern) =>
    globSync(pattern, { absolute: true, cwd: ROOT }),
  )
    .filter((file) => !EXCLUDE.test(file))
    .sort();

  const reports: FileReport[] = [];
  for (const file of files) {
    const report = analyze(file);
    if (report !== null) reports.push(report);
  }

  if (json) {
    console.log(JSON.stringify(reports, null, 2));
    if (
      strict &&
      reports.some((r) => hasHoistViolation(r) || hasMultiComponent(r))
    ) {
      process.exit(1);
    }
    return;
  }

  const hoist = reports.filter(hasHoistViolation);
  const multi = reports.filter(hasMultiComponent);
  const overCap = reports.filter((r) => !r.optOut && r.overCap);
  const hookHeavy = reports.filter(isHookHeavy);

  const byProject = new Map<string, number>();
  for (const r of [...hoist, ...multi, ...overCap]) {
    byProject.set(r.project, (byProject.get(r.project) ?? 0) + 1);
  }

  logger.heading('Component primitive-shape audit (R4/R5/R6/R7)');
  logger.info(`Scanned ${reports.length} in-scope components.`);
  logger.blank();

  logger.info(`R4 — file-scope helpers/data to hoist: ${hoist.length} file(s)`);
  for (const r of hoist) {
    const bits = [
      r.helperDecls > 0 ? `${r.helperDecls} helper(s)→utils/` : '',
      r.dataDecls > 0 ? `${r.dataDecls} data/config→data/|config/` : '',
    ].filter(Boolean);
    logger.detail(`${r.file}  (${bits.join(', ')})`);
  }

  logger.blank();
  logger.info(`R5 — more than one exported component: ${multi.length} file(s)`);
  for (const r of multi) logger.detail(`${r.file}  (${r.exportedComponents})`);

  logger.blank();
  logger.info(`R6 — over the ${LINE_CAP}-line cap: ${overCap.length} file(s)`);
  for (const r of overCap.sort((a, b) => b.lineCount - a.lineCount)) {
    logger.detail(`${r.file}  (${r.lineCount})`);
  }

  logger.blank();
  logger.info(
    `R7 — advisory: consider extracting a use<Name> hook: ${hookHeavy.length} file(s)`,
  );
  for (const r of hookHeavy) {
    logger.detail(
      `${r.file}  (${r.useStateCount} useState, ${r.statements} statements)`,
    );
  }

  logger.blank();
  logger.info('Violations by project (R4+R5+R6):');
  for (const [project, count] of [...byProject.entries()].sort()) {
    logger.detail(`${project}: ${count}`);
  }

  const optOuts = reports.filter((r) => r.optOut);
  if (optOuts.length > 0) {
    logger.blank();
    logger.info(`Opt-out files (excluded from violations): ${optOuts.length}`);
    for (const r of optOuts) logger.detail(r.file);
  }

  if (strict && (hoist.length > 0 || multi.length > 0)) {
    logger.blank();
    logger.fail('R4/R5 violations present — failing (--strict).');
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
