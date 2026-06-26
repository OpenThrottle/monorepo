import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Node, Project } from 'ts-morph';
import { Node as TsNode, Project as TsProject, ts } from 'ts-morph';

import type { WorkspaceConfig } from '../config/workspace-config.ts';
import { resolveWorkspaceConfig } from '../config/workspace-config.ts';
import { hashContent } from '../utils/hash.ts';
import { listFiles } from './workspace.ts';

/**
 * An embeddable slice of a source file. Chunks are the unit the semantic layer
 * embeds and stores: each carries its workspace-relative path, 1-based line
 * range, and the raw text. The `id` is derived from the path and chunk content
 * (see {@link chunkFile}), so an unchanged chunk keeps a stable id across scans
 * — the property the incremental vector ingest relies on to avoid re-embedding
 * code that didn't move.
 *
 * @publicApi
 */
export interface CodeChunk {
  /** The chunk's raw source text. */
  content: string;
  /** 1-based inclusive last line of the chunk within its file. */
  endLine: number;
  /** Stable, content-derived id (`hashContent(path + content)`). */
  id: string;
  /** Workspace-relative POSIX path of the file the chunk came from. */
  path: string;
  /** 1-based first line of the chunk within its file. */
  startLine: number;
}

/** Options tuning how files are split into {@link CodeChunk}s. */
export interface ChunkOptions {
  /**
   * Number of lines per chunk for the line-window fallback (non-TS files, or
   * TS files with no top-level declarations). Defaults to
   * {@link DEFAULT_CHUNK_WINDOW_LINES}.
   */
  windowLines?: number;
}

/** Default line-window size used by the non-AST fallback chunker. */
export const DEFAULT_CHUNK_WINDOW_LINES = 60;

/** Script extensions chunked with AST-aware boundaries (mirrors the symbols layer). */
const SCRIPT_FILE_PATTERN = /\.(?:[cm]?[jt]sx?)$/;

/**
 * Split a single source file into embeddable {@link CodeChunk}s.
 *
 * For TypeScript/JavaScript files the splitter is AST-aware (depends on the
 * symbols plan's ts-morph integration): each top-level declaration
 * (function/class/interface/type/enum/namespace/variable statement, with its
 * leading JSDoc) becomes one chunk, and runs of glue statements (imports,
 * re-exports) between declarations are grouped together. Any other file type —
 * or a script file with no top-level declarations — falls back to fixed
 * line-windows. Both paths are pure: no filesystem access, deterministic for a
 * given `(path, content)`.
 *
 * @publicApi
 */
export function chunkFile(
  path: string,
  content: string,
  options: ChunkOptions = {},
): CodeChunk[] {
  if (content.length === 0) {
    return [];
  }

  if (SCRIPT_FILE_PATTERN.test(path) && !path.endsWith('.d.ts')) {
    const astChunks = chunkScript(path, content);
    // A script with no top-level declarations (e.g. a comment-only or
    // expression-only file) yields nothing AST-aware; fall back so it is still
    // represented.
    if (astChunks.length > 0) {
      return astChunks;
    }
  }

  return lineWindowChunks(path, content, options.windowLines);
}

/**
 * Enumerate the workspace and chunk every tracked file, honoring the same
 * `.gitignore` / exclude-glob scoping as {@link listFiles}. Files that cannot
 * be read as text are skipped rather than failing the whole scan.
 *
 * @publicApi
 */
export async function chunkWorkspace(
  config: WorkspaceConfig,
  options: ChunkOptions = {},
): Promise<CodeChunk[]> {
  const resolved = resolveWorkspaceConfig(config);
  const paths = await listFiles(config);

  const perFile = await Promise.all(
    paths.map(async (path) => {
      try {
        const content = await readFile(join(resolved.root, path), 'utf8');
        return chunkFile(path, content, options);
      } catch {
        // Unreadable / binary file — skip it.
        return [];
      }
    }),
  );

  return perFile.flat();
}

/**
 * Lazily-built in-memory ts-morph project used purely to parse a single file's
 * syntax tree for chunking. Kept module-level so we don't pay project setup per
 * file; each parse overwrites and then removes its source file to bound memory.
 */
let parseProject: Project | undefined;

function getParseProject(): Project {
  parseProject ??= new TsProject({
    compilerOptions: {
      allowJs: true,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.Latest,
    },
    useInMemoryFileSystem: true,
  });

  return parseProject;
}

function chunkScript(path: string, content: string): CodeChunk[] {
  const project = getParseProject();
  // ts-morph derives its scanner from the file extension, so pass the real path
  // (mapped into the in-memory FS) to parse .tsx/.mts/etc. correctly.
  const sourceFile = project.createSourceFile(`/${path}`, content, {
    overwrite: true,
  });

  try {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];
    let glue: Node[] = [];

    const flushGlue = (): void => {
      if (glue.length === 0) {
        return;
      }
      const first = glue[0];
      const last = glue[glue.length - 1];
      pushChunk(
        chunks,
        path,
        lines,
        first.getStartLineNumber(true),
        last.getEndLineNumber(),
      );
      glue = [];
    };

    for (const statement of sourceFile.getStatements()) {
      if (isMajorDeclaration(statement)) {
        flushGlue();
        pushChunk(
          chunks,
          path,
          lines,
          statement.getStartLineNumber(true),
          statement.getEndLineNumber(),
        );
      } else {
        glue.push(statement);
      }
    }
    flushGlue();

    return chunks;
  } finally {
    project.removeSourceFile(sourceFile);
  }
}

function isMajorDeclaration(node: Node): boolean {
  return (
    TsNode.isFunctionDeclaration(node) ||
    TsNode.isClassDeclaration(node) ||
    TsNode.isInterfaceDeclaration(node) ||
    TsNode.isTypeAliasDeclaration(node) ||
    TsNode.isEnumDeclaration(node) ||
    TsNode.isModuleDeclaration(node) ||
    TsNode.isVariableStatement(node)
  );
}

function lineWindowChunks(
  path: string,
  content: string,
  windowLines = DEFAULT_CHUNK_WINDOW_LINES,
): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];

  for (let start = 0; start < lines.length; start += windowLines) {
    const slice = lines.slice(start, start + windowLines);
    if (slice.join('').trim().length === 0) {
      continue;
    }
    pushChunk(chunks, path, lines, start + 1, start + slice.length);
  }

  return chunks;
}

/**
 * Materialize the `[startLine, endLine]` (1-based, inclusive) slice of `lines`
 * into a {@link CodeChunk}. The id hashes path + content so it is stable while
 * the chunk text is unchanged, yet unique across files with identical content.
 */
function pushChunk(
  chunks: CodeChunk[],
  path: string,
  lines: string[],
  startLine: number,
  endLine: number,
): void {
  const content = lines.slice(startLine - 1, endLine).join('\n');
  chunks.push({
    content,
    endLine,
    id: hashContent(`${path}\n${content}`),
    path,
    startLine,
  });
}
