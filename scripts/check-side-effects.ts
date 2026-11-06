/**
 * @description Recommends — and, with `--strict`, enforces — a truthful
 * `sideEffects` field for every workspace project's `package.json`.
 *
 * `sideEffects` is bundler metadata (Rolldown/Vite, esbuild, webpack). Declaring
 * `false` lets a bundler drop a module whose exports nothing uses, **top-level
 * code included**. Leaving the field out makes it assume every module reachable
 * through a barrel `export *` must be kept: #422 measured that at 70% of the
 * developer app's client JS. So the field is worth declaring everywhere, and
 * worth declaring only when it is true.
 *
 * This script makes "true" checkable. It parses every tracked source module of
 * a project with the TypeScript compiler API and reports the ones that do
 * something observable when evaluated. A clean project gets `false`; a project
 * with findings gets an array naming exactly those files.
 *
 * ## What counts as a side effect
 *
 * A module-level statement is a side effect when it exists for what it does
 * rather than for a value it binds:
 *
 * - **A discarded expression** — `registerEnumType(...)`, `polyfill()`,
 *   `globalThis.X = …`, `Object.defineProperty(...)`, an IIFE. Directive
 *   prologues (`'use client'`) and `/* @__PURE__ *\/`-annotated calls are not.
 * - **Top-level control flow** — `if`, `for`, `try`, a bare block, and so on.
 * - **Top-level `await`**, wherever it appears in a module-level statement.
 * - **A bare import of a script module** — `import 'x'`, `import './x'`,
 *   `import {} from 'x'`. The importer exists to trigger the target's
 *   evaluation, so the importer is listed.
 *
 * A **bound** call — `export const store = createStore()` — is deliberately
 * clean. A call whose result is given a name is assumed to construct a value;
 * a call whose result is thrown away can only be there for its effect. Treating
 * every initializer call as suspect would flag nearly every module in the
 * workspace and make the recommendation useless.
 *
 * ## Stylesheets
 *
 * Every tracked stylesheet a project ships is a side effect: the only thing a
 * stylesheet can do is be imported for its effect, whether by the project
 * itself or by a consumer through a `style` field or a subpath. So any
 * stylesheet adds `**\/*.css` (or the matching extension) to the array — what
 * webpack documents and what `react-router-scheduling` already declares.
 *
 * The importing module is never charged for it. Listing the component that
 * imports `./calendar.css` would pin the whole component into every bundle
 * that touches its barrel — undoing the win the field exists for. (Vite and
 * Rolldown already keep CSS regardless, so for them the glob changes no
 * output; it is there so the declaration is true for every bundler.)
 *
 * ## Built packages
 *
 * A package whose `main` points into a build directory (`./dist/src/index.js`)
 * is consumed as emitted JavaScript, so a bundler matches `dist/src/bin.js`,
 * never `src/bin.ts`. For those, each flagged module is required at both
 * paths: the source path keeps a source-first consumer (Vitest, a workspace
 * alias) honest, and the emitted path is the one a bundler actually sees.
 * Emitted paths are untracked, so they are exempt from the stale-entry check.
 *
 * ## Decorators
 *
 * Decorated classes are counted, not flagged. A class decorator runs when the
 * module evaluates, but its effect (Nest metadata, a registry entry) only
 * matters to code that imports the class — and importing the class keeps the
 * module. The count is reported for the NestJS packages, where it is the thing
 * a reviewer will ask about.
 *
 * Entry modules (`main.ts`, React Router `entry.*`) are flagged like anything
 * else. Listing them is harmless — a bundler never drops an entry — and keeps
 * the rule free of a per-framework entry list that would go stale.
 *
 * Usage: `tsx scripts/check-side-effects.ts [--json] [--strict] [--project <name>]`.
 * Without `--strict` it reports and exits 0.
 */
import { readFileSync } from 'node:fs';
import { join, matchesGlob, posix } from 'node:path';

import ts from 'typescript';

import { createLogger, run } from './utils/index.ts';

const logger = createLogger();

/** The workspace folders that hold one project per child directory. */
export const PROJECT_ROOTS: readonly string[] = [
  'applications',
  'packages',
  'tools',
];

/** Folders inside a project whose modules a consumer can reach. */
export const SOURCE_FOLDERS: readonly string[] = ['app', 'src'];

const SCRIPT_EXTENSION = /\.(?:[cm]?[jt]sx?)$/;
const STYLE_EXTENSION = /\.(?:css|less|sass|scss)$/;

/** Files no consumer ever imports: tests, stories, mocks, declarations. */
const EXCLUDED_FILE =
  /(?:\.(?:test|spec|stories)\.[cm]?[jt]sx?$)|(?:\.d\.[cm]?ts$)|(?:\/__(?:tests|mocks|fixtures)__\/)|(?:\/generators\/.+\/files\/)/;

export const SIDE_EFFECT_KIND = {
  BARE_IMPORT: 'bare-import',
  CONTROL_FLOW: 'control-flow',
  DISCARDED_EXPRESSION: 'discarded-expression',
  IMPORTED_FOR_EFFECT: 'imported-for-effect',
  TOP_LEVEL_AWAIT: 'top-level-await',
} as const;

export type SideEffectKind =
  (typeof SIDE_EFFECT_KIND)[keyof typeof SIDE_EFFECT_KIND];

/** One module-level statement that does something when evaluated. */
export interface SideEffectFinding {
  readonly kind: SideEffectKind;
  readonly line: number;
  readonly text: string;
}

/** A bare import of a module in the same project: `import './x.ts'`. */
export interface EffectImport {
  readonly line: number;
  readonly specifier: string;
}

/** What one module does on evaluation. */
export interface ModuleScan {
  readonly decoratedClasses: number;
  readonly effectImports: readonly EffectImport[];
  readonly findings: readonly SideEffectFinding[];
  readonly styleImports: readonly string[];
}

/** A project's `sideEffects` value as declared in its `package.json`. */
export type DeclaredSideEffects = boolean | readonly string[] | undefined;

export const VERDICT = {
  DECLARED_TRUE: 'declared-true',
  MISSING: 'missing',
  OK: 'ok',
  STALE_ENTRY: 'stale-entry',
  UNLISTED: 'unlisted',
} as const;

export type Verdict = (typeof VERDICT)[keyof typeof VERDICT];

/** The scan of one project, with its recommendation and verdict. */
export interface ProjectReport {
  readonly declared: DeclaredSideEffects;
  readonly decoratedClasses: number;
  readonly files: readonly string[];
  readonly findings: Readonly<Record<string, readonly SideEffectFinding[]>>;
  readonly name: string;
  readonly path: string;
  readonly recommended: false | readonly string[];
  readonly staleEntries: readonly string[];
  readonly unlisted: readonly string[];
  readonly verdict: Verdict;
}

const firstLine = (node: ts.Node, source: ts.SourceFile): string => {
  const text = node.getText(source).split('\n')[0] ?? '';

  return text.length > 100 ? `${text.slice(0, 97)}...` : text;
};

const lineOf = (node: ts.Node, source: ts.SourceFile): number => {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
};

const containsAwait = (node: ts.Node): boolean => {
  if (ts.isAwaitExpression(node)) {
    return true;
  }

  if (ts.isForOfStatement(node) && node.awaitModifier !== undefined) {
    return true;
  }

  // An `await` inside a nested function belongs to that function, not to the
  // module's evaluation.
  if (ts.isFunctionLike(node) || ts.isClassLike(node)) {
    return false;
  }

  return ts.forEachChild(node, containsAwait) ?? false;
};

const hasPureAnnotation = (
  node: ts.Expression,
  source: ts.SourceFile,
): boolean => {
  const ranges =
    ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? [];

  return ranges.some((range) => {
    const comment = source.text.slice(range.pos, range.end);

    return /[@#]__PURE__/.test(comment);
  });
};

const isDirective = (statement: ts.ExpressionStatement): boolean => {
  return ts.isStringLiteral(statement.expression);
};

const isBareImport = (statement: ts.ImportDeclaration): boolean => {
  const clause = statement.importClause;
  if (clause === undefined) {
    return true;
  }

  if (clause.isTypeOnly || clause.name !== undefined) {
    return false;
  }

  const bindings = clause.namedBindings;

  return (
    bindings !== undefined &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length === 0
  );
};

const specifierOf = (statement: ts.ImportDeclaration): string => {
  return ts.isStringLiteral(statement.moduleSpecifier)
    ? statement.moduleSpecifier.text
    : '';
};

const isDeclaration = (statement: ts.Statement): boolean => {
  return (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isModuleDeclaration(statement) ||
    ts.isImportEqualsDeclaration(statement) ||
    ts.isExportDeclaration(statement) ||
    ts.isEmptyStatement(statement)
  );
};

/** Names this module declares at its top level (imports excluded). */
const collectLocalNames = (source: ts.SourceFile): Set<string> => {
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name !== undefined
    ) {
      names.add(statement.name.text);
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.add(declaration.name.text);
        }
      }
    }
  }

  return names;
};

const rootIdentifierOf = (expression: ts.Expression): string | undefined => {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (
    ts.isPropertyAccessExpression(expression) ||
    ts.isElementAccessExpression(expression)
  ) {
    return rootIdentifierOf(expression.expression);
  }

  return undefined;
};

/**
 * `Button.displayName = 'Button'` — an assignment to a property of something
 * this module declared. It only changes a value the module owns, and nothing
 * outside can observe it without importing that value, which keeps the module.
 */
const isLocalMutation = (
  expression: ts.Expression,
  localNames: ReadonlySet<string>,
): boolean => {
  if (
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken
  ) {
    return false;
  }

  const target = expression.left;
  if (
    !ts.isPropertyAccessExpression(target) &&
    !ts.isElementAccessExpression(target)
  ) {
    return false;
  }

  const root = rootIdentifierOf(target);

  return root !== undefined && localNames.has(root);
};

const isRelativeSpecifier = (specifier: string): boolean => {
  return specifier.startsWith('./') || specifier.startsWith('../');
};

const countDecoratedClass = (statement: ts.Statement): number => {
  if (!ts.isClassDeclaration(statement)) {
    return 0;
  }

  return ts.getDecorators(statement) === undefined ? 0 : 1;
};

/**
 * Classify one module-level statement. Returns the finding it produces, or
 * `undefined` when evaluating it does nothing beyond binding names.
 */
const classifyStatement = (
  statement: ts.Statement,
  source: ts.SourceFile,
  localNames: ReadonlySet<string>,
): SideEffectFinding | undefined => {
  const finding = (kind: SideEffectKind): SideEffectFinding => {
    return {
      kind,
      line: lineOf(statement, source),
      text: firstLine(statement, source),
    };
  };

  if (ts.isImportDeclaration(statement)) {
    return undefined;
  }

  if (containsAwait(statement)) {
    return finding(SIDE_EFFECT_KIND.TOP_LEVEL_AWAIT);
  }

  if (ts.isVariableStatement(statement) || ts.isExportAssignment(statement)) {
    return undefined;
  }

  if (isDeclaration(statement)) {
    return undefined;
  }

  if (ts.isExpressionStatement(statement)) {
    if (isDirective(statement)) {
      return undefined;
    }

    if (hasPureAnnotation(statement.expression, source)) {
      return undefined;
    }

    if (isLocalMutation(statement.expression, localNames)) {
      return undefined;
    }

    return finding(SIDE_EFFECT_KIND.DISCARDED_EXPRESSION);
  }

  return finding(SIDE_EFFECT_KIND.CONTROL_FLOW);
};

/** Scan one module's text for what it does when evaluated. */
export const scanModule = (fileName: string, text: string): ModuleScan => {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const localNames = collectLocalNames(source);
  const effectImports: EffectImport[] = [];
  const findings: SideEffectFinding[] = [];
  const styleImports: string[] = [];
  let decoratedClasses = 0;

  for (const statement of source.statements) {
    decoratedClasses += countDecoratedClass(statement);

    if (ts.isImportDeclaration(statement) && isBareImport(statement)) {
      const specifier = specifierOf(statement);
      const line = lineOf(statement, source);
      if (STYLE_EXTENSION.test(specifier)) {
        styleImports.push(specifier);
      } else if (isRelativeSpecifier(specifier)) {
        effectImports.push({ line, specifier });
      } else {
        findings.push({
          kind: SIDE_EFFECT_KIND.BARE_IMPORT,
          line,
          text: firstLine(statement, source),
        });
      }

      continue;
    }

    const finding = classifyStatement(statement, source, localNames);
    if (finding !== undefined) {
      findings.push(finding);
    }
  }

  return { decoratedClasses, effectImports, findings, styleImports };
};

/**
 * Normalize a `sideEffects` glob to the semantics every bundler shares: an
 * entry with no `/` matches a basename anywhere (`*.css` is `**\/*.css`), and a
 * leading `./` is relative to the package root.
 */
export const normalizeGlob = (glob: string): string => {
  if (!glob.includes('/')) {
    return `**/${glob}`;
  }

  return glob.startsWith('./') ? glob.slice(2) : glob;
};

/** True when a package-relative path matches any of the declared globs. */
export const matchesAnyGlob = (
  path: string,
  globs: readonly string[],
): boolean => {
  return globs.some((glob) => {
    return matchesGlob(path, normalizeGlob(glob));
  });
};

const extensionOf = (path: string): string => {
  return path.slice(path.lastIndexOf('.') + 1);
};

/**
 * Where tsc emits a source module: `src/a/b.ts` → `dist/src/a/b.js`.
 */
export const emittedPathOf = (
  sourcePath: string,
  buildDirectory: string,
): string => {
  const javascript = sourcePath.replace(/\.([cm]?)tsx?$/, '.$1js');

  return `${buildDirectory}/${javascript}`;
};

const withEmittedPaths = (
  files: readonly string[],
  buildDirectory: string | undefined,
): string[] => {
  if (buildDirectory === undefined) {
    return [...files];
  }

  return files.flatMap((file) => {
    return [file, emittedPathOf(file, buildDirectory)];
  });
};

/**
 * The directory a package's `main` points into when it is consumed as built
 * output — `dist` for `./dist/src/index.js` — or `undefined` when `main`
 * names source (or is absent).
 */
export const buildDirectoryOf = (
  main: string | undefined,
): string | undefined => {
  const relative = (main ?? '').replace(/^\.\//, '');
  const directory = /^([^/]+)\/src\//.exec(relative)?.[1];

  return directory === 'src' ? undefined : directory;
};

/**
 * The recommendation for a project: `false` when nothing it ships has a side
 * effect, otherwise `**\/*.<ext>` per stylesheet extension in use followed by
 * the exact path of each flagged module.
 */
export const recommend = (
  flaggedFiles: readonly string[],
  styleFiles: readonly string[],
  buildDirectory: string | undefined = undefined,
): false | readonly string[] => {
  const styleGlobs = [...new Set(styleFiles.map(extensionOf))]
    .sort()
    .map((extension) => {
      return `**/*.${extension}`;
    });
  const moduleGlobs = withEmittedPaths(flaggedFiles, buildDirectory)
    .sort()
    .map((path) => {
      return `./${path}`;
    });
  const globs = [...styleGlobs, ...moduleGlobs];

  return globs.length === 0 ? false : globs;
};

const isDeclaredSideEffects = (
  value: unknown,
): value is DeclaredSideEffects => {
  if (value === undefined || typeof value === 'boolean') {
    return true;
  }

  return (
    Array.isArray(value) &&
    value.every((entry) => {
      return typeof entry === 'string';
    })
  );
};

interface PackageJsonShape {
  readonly main: string | undefined;
  readonly name: string;
  readonly sideEffects: DeclaredSideEffects;
}

const readPackageJson = (absolutePath: string): PackageJsonShape => {
  const parsed: unknown = JSON.parse(readFileSync(absolutePath, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) {
    return { main: undefined, name: absolutePath, sideEffects: undefined };
  }

  const name = 'name' in parsed && typeof parsed.name === 'string' ? parsed.name : absolutePath; // prettier-ignore
  const sideEffects = 'sideEffects' in parsed ? parsed.sideEffects : undefined;
  const main = 'main' in parsed && typeof parsed.main === 'string' ? parsed.main : undefined; // prettier-ignore

  return {
    main,
    name,
    sideEffects: isDeclaredSideEffects(sideEffects) ? sideEffects : undefined,
  };
};

const RESOLVE_SUFFIXES: readonly string[] = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '/index.ts',
  '/index.tsx',
  '/index.js',
];

/**
 * Resolve a relative specifier from `importer` to one of the project's files,
 * the way TypeScript does: as written, with an extension added, as a folder
 * index, or with a `.js` specifier standing for its `.ts` source.
 */
export const resolveRelativeImport = (
  importer: string,
  specifier: string,
  files: ReadonlySet<string>,
): string | undefined => {
  const base = posix.normalize(posix.join(posix.dirname(importer), specifier));
  const sourceBase = base.replace(/\.([cm]?)js(x?)$/, '.$1ts$2');
  const candidates = [base, sourceBase].flatMap((stem) => {
    return RESOLVE_SUFFIXES.map((suffix) => {
      return `${stem}${suffix}`;
    });
  });

  return candidates.find((candidate) => {
    return files.has(candidate);
  });
};

/**
 * Turn every bare relative import into a finding on the module it targets —
 * that module is imported for its effect, so it is the one that must stay. A
 * target that cannot be resolved inside the project is charged to the
 * importer instead, because then the importer is the only file we can name.
 */
const attributeEffectImports = (
  scans: Readonly<Record<string, ModuleScan>>,
  files: readonly string[],
): Record<string, SideEffectFinding[]> => {
  const known = new Set(files);
  const findings: Record<string, SideEffectFinding[]> = {};
  const add = (file: string, finding: SideEffectFinding): void => {
    findings[file] = [...(findings[file] ?? []), finding];
  };

  for (const [importer, scan] of Object.entries(scans)) {
    for (const finding of scan.findings) {
      add(importer, finding);
    }

    for (const effectImport of scan.effectImports) {
      const target = resolveRelativeImport(importer, effectImport.specifier, known); // prettier-ignore
      if (target === undefined) {
        add(importer, {
          kind: SIDE_EFFECT_KIND.BARE_IMPORT,
          line: effectImport.line,
          text: `import '${effectImport.specifier}' (unresolved)`,
        });
      } else {
        add(target, {
          kind: SIDE_EFFECT_KIND.IMPORTED_FOR_EFFECT,
          line: 1,
          text: `imported bare by ${importer}:${effectImport.line}`,
        });
      }
    }
  }

  return findings;
};

/** Inputs to {@link judgeProject}: everything read from disk, already scanned. */
export interface ProjectScanInput {
  readonly buildDirectory: string | undefined;
  readonly declared: DeclaredSideEffects;
  readonly files: readonly string[];
  readonly name: string;
  readonly path: string;
  readonly scans: Readonly<Record<string, ModuleScan>>;
  readonly styleFiles: readonly string[];
}

/** Compare what a project declares with what its modules do. */
export const judgeProject = (input: ProjectScanInput): ProjectReport => {
  const { buildDirectory, declared, files, name, path, scans, styleFiles } =
    input;

  const findings = attributeEffectImports(scans, files);
  const decoratedClasses = Object.values(scans).reduce((total, scan) => {
    return total + scan.decoratedClasses;
  }, 0);

  const flagged = Object.keys(findings);
  const recommended = recommend(flagged, styleFiles, buildDirectory);
  const mustBeListed = [
    ...styleFiles,
    ...withEmittedPaths(flagged, buildDirectory),
  ];

  const declaredGlobs = Array.isArray(declared) ? declared : [];
  const isUnlisted = (file: string): boolean => {
    return declared !== true && !matchesAnyGlob(file, declaredGlobs);
  };
  const unlisted = mustBeListed.filter(isUnlisted);
  const knownFiles = [...files, ...styleFiles];
  const isEmittedGlob = (glob: string): boolean => {
    return (
      buildDirectory !== undefined &&
      normalizeGlob(glob).startsWith(`${buildDirectory}/`)
    );
  };
  const staleEntries = declaredGlobs.filter((glob) => {
    if (isEmittedGlob(glob)) {
      return false;
    }

    return !knownFiles.some((file) => {
      return matchesGlob(file, normalizeGlob(glob));
    });
  });

  const verdictFor = (): Verdict => {
    if (declared === undefined) {
      return VERDICT.MISSING;
    }

    if (declared === true) {
      return VERDICT.DECLARED_TRUE;
    }

    if (unlisted.length > 0) {
      return VERDICT.UNLISTED;
    }

    return staleEntries.length > 0 ? VERDICT.STALE_ENTRY : VERDICT.OK;
  };

  return {
    declared,
    decoratedClasses,
    files,
    findings,
    name,
    path,
    recommended,
    staleEntries,
    unlisted,
    verdict: verdictFor(),
  };
};

/** Every tracked project directory under {@link PROJECT_ROOTS}. */
export const listProjects = (cwd: string): string[] => {
  const result = run(
    'git',
    ['ls-files', '--', ...PROJECT_ROOTS.map((root) => `${root}/*/package.json`)], // prettier-ignore
    { cwd },
  );

  return result.stdout
    .split('\n')
    .filter((line) => {
      return line.split('/').length === 3;
    })
    .map((line) => {
      return line.slice(0, line.lastIndexOf('/'));
    })
    .sort();
};

/** Tracked source and stylesheet paths of a project, relative to it. */
export const listProjectFiles = (
  cwd: string,
  projectPath: string,
): { readonly scripts: string[]; readonly styles: string[] } => {
  const result = run(
    'git',
    ['ls-files', '--', ...SOURCE_FOLDERS.map((folder) => `${projectPath}/${folder}`)], // prettier-ignore
    { cwd },
  );
  const relative = result.stdout
    .split('\n')
    .filter((line) => {
      return line !== '' && !EXCLUDED_FILE.test(`/${line}`);
    })
    .map((line) => {
      return line.slice(projectPath.length + 1);
    });

  return {
    scripts: relative.filter((path) => {
      return SCRIPT_EXTENSION.test(path);
    }),
    styles: relative.filter((path) => {
      return STYLE_EXTENSION.test(path);
    }),
  };
};

/** Scan one project on disk and judge it. */
export const scanProject = (
  cwd: string,
  projectPath: string,
): ProjectReport => {
  const packageJson = readPackageJson(join(cwd, projectPath, 'package.json'));
  const { scripts, styles } = listProjectFiles(cwd, projectPath);

  const scans: Record<string, ModuleScan> = {};
  for (const file of scripts) {
    const text = readFileSync(join(cwd, projectPath, file), 'utf8');
    scans[file] = scanModule(file, text);
  }

  return judgeProject({
    buildDirectory: buildDirectoryOf(packageJson.main),
    declared: packageJson.sideEffects,
    files: scripts,
    name: packageJson.name,
    path: projectPath,
    scans,
    styleFiles: styles,
  });
};

const describeDeclared = (declared: DeclaredSideEffects): string => {
  return declared === undefined ? '(missing)' : JSON.stringify(declared);
};

const reportProject = (report: ProjectReport): void => {
  logger.info(`${report.path}  [${report.verdict}]`);
  logger.info(`  declared:    ${describeDeclared(report.declared)}`);
  logger.info(`  recommended: ${JSON.stringify(report.recommended)}`);
  for (const [file, findings] of Object.entries(report.findings)) {
    for (const finding of findings) {
      logger.info(`    ${file}:${finding.line} ${finding.kind}: ${finding.text}`); // prettier-ignore
    }
  }

  if (report.unlisted.length > 0) {
    logger.info(`  unlisted:    ${report.unlisted.join(', ')}`);
  }

  if (report.staleEntries.length > 0) {
    logger.info(`  stale:       ${report.staleEntries.join(', ')}`);
  }

  if (report.decoratedClasses > 0) {
    logger.info(`  decorated classes (informational): ${report.decoratedClasses}`); // prettier-ignore
  }
};

interface CliOptions {
  readonly json: boolean;
  readonly project: string | undefined;
  readonly strict: boolean;
}

const parseCli = (argv: readonly string[]): CliOptions => {
  const projectIndex = argv.indexOf('--project');

  return {
    json: argv.includes('--json'),
    project: projectIndex === -1 ? undefined : argv[projectIndex + 1],
    strict: argv.includes('--strict'),
  };
};

export const main = (
  argv: readonly string[] = process.argv.slice(2),
  cwd: string = process.cwd(),
): number => {
  const options = parseCli(argv);
  const reports = listProjects(cwd)
    .filter((path) => {
      return options.project === undefined || path.endsWith(`/${options.project}`); // prettier-ignore
    })
    .map((path) => {
      return scanProject(cwd, path);
    });
  const failing = reports.filter((report) => {
    return report.verdict !== VERDICT.OK;
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
  } else {
    for (const report of options.strict ? failing : reports) {
      reportProject(report);
    }

    logger.blank();
    logger.info(`${reports.length} project(s) scanned, ${failing.length} not ok.`); // prettier-ignore
  }

  if (!options.strict || failing.length === 0) {
    return 0;
  }

  logger.fail('Set each project\'s "sideEffects" to the recommended value above.'); // prettier-ignore

  return 1;
};

if (process.argv[1]?.endsWith('check-side-effects.ts')) {
  // exitCode, not exit(): `--json` output to a pipe is written asynchronously,
  // and exiting immediately truncates it at the pipe buffer (64 KB).
  process.exitCode = main();
}
