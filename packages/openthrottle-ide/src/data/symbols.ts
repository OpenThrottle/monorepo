import { join, relative, sep } from 'node:path';

import type {
  ExportedDeclarations,
  Project,
  ReferencedSymbolEntry,
  SourceFile,
} from 'ts-morph';
import { Node, ts } from 'ts-morph';

import type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from '../config/workspace-config.js';
import {
  filterRealPathsInsideRoot,
  resolveInsideRoot,
  resolveWorkspaceConfig,
} from '../config/workspace-config.js';
import { runRipgrep, workspaceRipgrepArgs } from '../utils/ripgrep.js';
import { loadProject } from './ts-project.js';

/** A symbol exported from the workspace, resolved to its declaration site. */
export interface ExportedSymbol {
  /** `true` when this is the module's default export. */
  isDefault: boolean;
  /** Declaration kind, e.g. `function`, `class`, `interface`, `type`, `const`. */
  kind: string;
  /** 1-based line of the declaration. */
  line: number;
  /** Exported name (the declaration's own name for default exports when known). */
  name: string;
  /** Workspace-relative POSIX path of the declaration's file. */
  path: string;
}

/** Options that scope {@link listExports}. */
export interface ListExportsOptions {
  /**
   * Restrict enumeration to these ripgrep globs, e.g. `['src/**\/*.ts']`.
   * Applied on top of `.gitignore` and the workspace exclude globs.
   */
  globs?: string[];
}

/** Script extensions the symbol layer parses. */
const SCRIPT_FILE_PATTERN = /\.(?:[cm]?[jt]sx?)$/;

/**
 * Enumerate the exported symbols of the workspace (or a glob subset), resolving
 * re-exports and barrels so each symbol's reported origin is its declaration —
 * not the file that re-exports it. Paths are workspace-relative, consistent
 * with {@link listFiles} and {@link searchText}.
 *
 * @publicApi
 */
export async function listExports(
  config: WorkspaceConfig,
  options: ListExportsOptions = {},
): Promise<ExportedSymbol[]> {
  const resolved = resolveWorkspaceConfig(config);
  const project = loadProject(config);
  const sourceFiles = await addWorkspaceSourceFiles(
    project,
    resolved,
    options.globs,
  );

  const seen = new Set<string>();
  const symbols: ExportedSymbol[] = [];

  for (const sourceFile of sourceFiles) {
    for (const [
      exportName,
      declarations,
    ] of sourceFile.getExportedDeclarations()) {
      for (const declaration of declarations) {
        const symbol = toExportedSymbol(exportName, declaration, resolved);
        const key = `${symbol.path}|${symbol.line}|${symbol.name}|${symbol.isDefault}`;

        if (!seen.has(key)) {
          seen.add(key);
          symbols.push(symbol);
        }
      }
    }
  }

  return symbols.sort(compareSymbols);
}

/** A 1-based source position inside a workspace file. */
export interface SymbolPosition {
  /** 1-based column. */
  column: number;
  /** 1-based line. */
  line: number;
  /** Workspace-relative path of the file. */
  path: string;
}

/** A symbol identified by name rather than a source position. */
export interface SymbolName {
  /** The declared/exported name to resolve. */
  name: string;
}

/** What {@link findDefinition} / {@link findReferences} resolve from. */
export type SymbolTarget = SymbolName | SymbolPosition;

/** A resolved declaration site. */
export interface DefinitionLocation {
  /** 1-based column of the declaration's name. */
  column: number;
  /** Declaration kind when known, e.g. `function`, `class`, `const`. */
  kind?: string;
  /** 1-based line of the declaration's name. */
  line: number;
  /** Declared name when known. */
  name?: string;
  /** Workspace-relative POSIX path of the declaration's file. */
  path: string;
}

/**
 * Resolve the definition location(s) for a symbol, given either a source
 * {@link SymbolPosition} (go-to-definition on an identifier) or a
 * {@link SymbolName}. Resolves imported symbols across files. Returns an empty
 * array — never throws — when nothing resolves.
 *
 * @publicApi
 */
export async function findDefinition(
  config: WorkspaceConfig,
  target: SymbolTarget,
): Promise<DefinitionLocation[]> {
  const resolved = resolveWorkspaceConfig(config);
  const project = loadProject(config);

  const declarations = isPositionTarget(target)
    ? definitionsAtPosition(project, resolved, target)
    : await definitionsByName(project, resolved, target.name);

  return dedupeLocations(
    declarations.map((node) => toDefinitionLocation(node, resolved)),
  );
}

function definitionsAtPosition(
  project: Project,
  resolved: ResolvedWorkspaceConfig,
  position: SymbolPosition,
): Node[] {
  const sourceFile = getOrAddSourceFile(project, resolved, position.path);

  if (sourceFile === undefined) {
    return [];
  }

  const offset = ts.getPositionOfLineAndCharacter(
    sourceFile.compilerNode,
    position.line - 1,
    position.column - 1,
  );
  const node = sourceFile.getDescendantAtPos(offset);

  if (node === undefined || !Node.isIdentifier(node)) {
    return [];
  }

  return node.getDefinitionNodes();
}

async function definitionsByName(
  project: Project,
  resolved: ResolvedWorkspaceConfig,
  name: string,
): Promise<Node[]> {
  const sourceFiles = await addWorkspaceSourceFiles(project, resolved);

  return sourceFiles.flatMap((sourceFile) =>
    namedDeclarations(sourceFile).filter(
      (declaration) => getDeclaredName(declaration) === name,
    ),
  );
}

function namedDeclarations(sourceFile: SourceFile): Node[] {
  return [
    ...sourceFile.getFunctions(),
    ...sourceFile.getClasses(),
    ...sourceFile.getInterfaces(),
    ...sourceFile.getTypeAliases(),
    ...sourceFile.getEnums(),
    ...sourceFile.getModules(),
    ...sourceFile.getVariableDeclarations(),
  ];
}

function toDefinitionLocation(
  node: Node,
  resolved: ResolvedWorkspaceConfig,
): DefinitionLocation {
  const sourceFile = node.getSourceFile();
  const anchor = getNameNode(node) ?? node;
  const { column, line } = sourceFile.getLineAndColumnAtPos(anchor.getStart());

  return {
    column,
    kind: resolveKind(node),
    line,
    name: getDeclaredName(node),
    path: toRelativePath(sourceFile.getFilePath(), resolved),
  };
}

function isPositionTarget(target: SymbolTarget): target is SymbolPosition {
  return 'path' in target;
}

function getNameNode(node: Node): Node | undefined {
  if (
    Node.isNamed(node) ||
    Node.isNameable(node) ||
    Node.isBindingNamed(node) ||
    Node.isPropertyNamed(node)
  ) {
    return node.getNameNode();
  }

  return undefined;
}

function getOrAddSourceFile(
  project: Project,
  resolved: ResolvedWorkspaceConfig,
  relativePath: string,
): SourceFile | undefined {
  // FS-scoping boundary: reject paths that escape the workspace root (absolute
  // segments or `../` traversal) before any read.
  const absolutePath = resolveInsideRoot(resolved, relativePath);

  if (absolutePath === undefined) {
    return undefined;
  }

  return (
    project.getSourceFile(absolutePath) ??
    project.addSourceFileAtPathIfExists(absolutePath)
  );
}

function dedupeLocations(
  locations: DefinitionLocation[],
): DefinitionLocation[] {
  const seen = new Set<string>();
  const unique: DefinitionLocation[] = [];

  for (const location of locations) {
    const key = `${location.path}|${location.line}|${location.column}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(location);
    }
  }

  return unique.sort(compareLocations);
}

function compareLocations(
  a: DefinitionLocation,
  b: DefinitionLocation,
): number {
  return a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column;
}

/** A single reference to a symbol. */
export interface ReferenceLocation {
  /** 1-based column of the reference. */
  column: number;
  /** `true` when the reference writes to the symbol, when ts-morph exposes it. */
  isWrite?: boolean;
  /** 1-based line of the reference. */
  line: number;
  /** Workspace-relative POSIX path of the referencing file. */
  path: string;
}

/**
 * Find every reference to a symbol across the workspace — the declaration site
 * and all usages, in every file — distinguishing writes from reads. The
 * inverse of {@link findDefinition}. Returns an empty array (never throws) when
 * the target resolves to nothing.
 *
 * @publicApi
 */
export async function findReferences(
  config: WorkspaceConfig,
  target: SymbolTarget,
): Promise<ReferenceLocation[]> {
  const resolved = resolveWorkspaceConfig(config);
  const project = loadProject(config);
  // References can live in any file, so the whole workspace must be loaded.
  const sourceFiles = await addWorkspaceSourceFiles(project, resolved);

  const targets = isPositionTarget(target)
    ? identifierAtPosition(project, resolved, target)
    : sourceFiles.flatMap((sourceFile) =>
        namedDeclarations(sourceFile).filter(
          (declaration) => getDeclaredName(declaration) === target.name,
        ),
      );

  const locations: ReferenceLocation[] = [];

  for (const node of targets) {
    if (!Node.isReferenceFindable(node)) {
      continue;
    }

    for (const referencedSymbol of node.findReferences()) {
      for (const entry of referencedSymbol.getReferences()) {
        locations.push(toReferenceLocation(entry, resolved));
      }
    }
  }

  return dedupeReferences(locations);
}

function identifierAtPosition(
  project: Project,
  resolved: ResolvedWorkspaceConfig,
  position: SymbolPosition,
): Node[] {
  const sourceFile = getOrAddSourceFile(project, resolved, position.path);

  if (sourceFile === undefined) {
    return [];
  }

  const offset = ts.getPositionOfLineAndCharacter(
    sourceFile.compilerNode,
    position.line - 1,
    position.column - 1,
  );
  const node = sourceFile.getDescendantAtPos(offset);

  return node !== undefined && Node.isIdentifier(node) ? [node] : [];
}

function toReferenceLocation(
  entry: ReferencedSymbolEntry,
  resolved: ResolvedWorkspaceConfig,
): ReferenceLocation {
  const node = entry.getNode();
  const sourceFile = node.getSourceFile();
  const { column, line } = sourceFile.getLineAndColumnAtPos(node.getStart());

  return {
    column,
    isWrite: entry.isWriteAccess(),
    line,
    path: toRelativePath(sourceFile.getFilePath(), resolved),
  };
}

function dedupeReferences(locations: ReferenceLocation[]): ReferenceLocation[] {
  const seen = new Set<string>();
  const unique: ReferenceLocation[] = [];

  for (const location of locations) {
    const key = `${location.path}|${location.line}|${location.column}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(location);
    }
  }

  return unique.sort(compareLocations);
}

function toExportedSymbol(
  exportName: string,
  declaration: ExportedDeclarations,
  resolved: ResolvedWorkspaceConfig,
): ExportedSymbol {
  // Derived from the declaration, not the export name: a barrel's
  // `export { default as Foo }` must produce the same entry as the declaring
  // module's `default`, so the two dedupe instead of racing on file order.
  const isDefault = exportName === 'default' || isDefaultExport(declaration);

  return {
    isDefault,
    kind: resolveKind(declaration),
    line: declaration.getStartLineNumber(),
    name:
      exportName === 'default'
        ? (getDeclaredName(declaration) ?? 'default')
        : exportName,
    path: toRelativePath(declaration.getSourceFile().getFilePath(), resolved),
  };
}

function isDefaultExport(declaration: ExportedDeclarations): boolean {
  return Node.isExportable(declaration) && declaration.isDefaultExport();
}

function resolveKind(node: Node): string {
  if (Node.isFunctionDeclaration(node)) {
    return 'function';
  }
  if (Node.isClassDeclaration(node)) {
    return 'class';
  }
  if (Node.isInterfaceDeclaration(node)) {
    return 'interface';
  }
  if (Node.isTypeAliasDeclaration(node)) {
    return 'type';
  }
  if (Node.isEnumDeclaration(node)) {
    return 'enum';
  }
  if (Node.isModuleDeclaration(node)) {
    return 'namespace';
  }
  if (Node.isVariableDeclaration(node)) {
    return node.getVariableStatement()?.getDeclarationKind() ?? 'variable';
  }

  return node.getKindName();
}

function getDeclaredName(node: Node): string | undefined {
  if (
    Node.isNamed(node) ||
    Node.isNameable(node) ||
    Node.isBindingNamed(node) ||
    Node.isPropertyNamed(node)
  ) {
    return node.getName();
  }

  return undefined;
}

/**
 * Add the workspace's script files to the project so symbol resolution sees
 * the whole tree. Honors `.gitignore`, the workspace exclude globs, and the
 * optional glob filter; existing source files (e.g. pulled in by import
 * resolution) are reused rather than re-added.
 */
async function addWorkspaceSourceFiles(
  project: Project,
  resolved: ResolvedWorkspaceConfig,
  globs?: string[],
): Promise<SourceFile[]> {
  const args = [...workspaceRipgrepArgs(resolved), '--files'];

  for (const glob of globs ?? []) {
    args.push('--glob', glob);
  }

  const { stdout } = await runRipgrep(args, resolved);
  const matchedPaths = stdout
    .split('\n')
    .filter(
      (line) => SCRIPT_FILE_PATTERN.test(line) && !line.endsWith('.d.ts'),
    );

  // With `followSymlinks`, `rg --follow` can list a symlinked file whose real
  // target is outside `root`; drop those before ts-morph reads them so symbol
  // resolution stays scoped to the workspace (mirrors listFilesResolved).
  const relativePaths = resolved.followSymlinks
    ? await filterRealPathsInsideRoot(resolved, matchedPaths)
    : matchedPaths;

  return relativePaths.map((relativePath) => {
    const absolutePath = join(resolved.root, relativePath);

    return (
      project.getSourceFile(absolutePath) ??
      project.addSourceFileAtPath(absolutePath)
    );
  });
}

function toRelativePath(
  absolutePath: string,
  resolved: ResolvedWorkspaceConfig,
): string {
  return relative(resolved.root, absolutePath).split(sep).join('/');
}

function compareSymbols(a: ExportedSymbol, b: ExportedSymbol): number {
  return (
    a.path.localeCompare(b.path) ||
    a.line - b.line ||
    a.name.localeCompare(b.name)
  );
}
