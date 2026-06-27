/* eslint-disable no-await-in-loop */

import path from 'path';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import type { Document } from '@langchain/core/documents';
import { getFilesByExtension } from '../utils/files';

export type Extension =
  | 'js'
  | 'json'
  | 'jsx'
  | 'md'
  | 'pdf'
  | 'ts'
  | 'tsx'
  | 'txt'
  | 'yaml'
  | 'yml';

/**
 * @description Derive the file extension (without the leading dot) from a path,
 * lower-cased. Falls back to `md` when the path has no extension.
 */
function getExtensionFromPath(filePath: string): string {
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();

  return ext || 'md';
}

/**
 * Load a single text-based file using LangChain's TextLoader. Metadata is
 * derived from the actual file extension rather than assuming markdown.
 */
export async function loadMarkdownFile(filePath: string): Promise<Document[]> {
  const loader = new TextLoader(filePath);
  const documents = await loader.load();

  const extension = getExtensionFromPath(filePath);
  const type = extension === 'md' ? 'markdown' : extension;

  // Add metadata about the file
  const documentsWithMetadata = documents.map((doc: Document) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      extension,
      source: filePath,
      type,
    },
  }));

  return documentsWithMetadata;
}

/**
 * Load all markdown files under `rootDir` (defaults to the current working
 * directory).
 */
export async function loadAllMarkdownFiles(
  rootDir?: string,
): Promise<Document[]> {
  const allDocuments: Document[] = [];
  const markdownFiles = await getFilesByExtension('md', rootDir);

  for (const filePath of markdownFiles) {
    const documents = await loadMarkdownFile(filePath);
    allDocuments.push(...documents);
  }

  return allDocuments;
}

/**
 * Load files of the given extension from specific directories under `rootDir`.
 * Directories are matched on path boundaries (segments), not substrings, so
 * `directory: 'docs'` does not also match `my-docs-archive/`.
 */
export async function loadFilesFromDirectories(
  directories: string[],
  extensions: Extension = 'md',
  rootDir?: string,
): Promise<Document[]> {
  const allDocuments: Document[] = [];

  // Glob once, then filter per directory rather than re-globbing the tree.
  const allFiles = await getFilesByExtension(extensions, rootDir);

  for (const directory of directories) {
    const target = directory.split(/[\\/]/).filter(Boolean);

    const directoryFiles = allFiles.filter((file) => {
      const segments = file.split(path.sep);

      // Match `target` as a contiguous run of path segments within `file`,
      // so `docs` matches `.../docs/...` but not `.../my-docs-archive/...`.
      return segments.some((_segment, index) =>
        target.every((part, offset) => segments[index + offset] === part),
      );
    });

    for (const filePath of directoryFiles) {
      const documents = await loadMarkdownFile(filePath);
      allDocuments.push(...documents);
    }
  }

  return allDocuments;
}

/**
 * Get statistics about loaded markdown documents
 */
export function getMarkdownDocumentStats(documents: Document[]): {
  averageDocumentLength: number;
  sources: string[];
  totalCharacters: number;
  totalDocuments: number;
} {
  const totalDocuments = documents.length;
  const totalCharacters = documents.reduce(
    (sum, doc) => sum + doc.pageContent.length,
    0,
  );

  const isEmpty = totalDocuments === 0;
  const averageDocumentLength = isEmpty ? 0 : totalCharacters / totalDocuments;
  const sources = [...new Set(documents.map((doc) => doc.metadata.source))];

  return {
    averageDocumentLength,
    sources,
    totalCharacters,
    totalDocuments,
  };
}
