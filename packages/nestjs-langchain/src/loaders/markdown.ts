/* eslint-disable no-await-in-loop */

import { TextLoader } from '@langchain/classic/dist/document_loaders/fs/text';
import { Document } from '@langchain/core/dist/documents';
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
 * Load a single markdown file using LangChain's TextLoader
 */
export async function loadMarkdownFile(filePath: string): Promise<Document[]> {
  try {
    console.log(`Loading: ${filePath}`);

    const loader = new TextLoader(filePath);
    const documents = await loader.load();

    // Add metadata about the file
    const documentsWithMetadata = documents.map((doc: Document) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        extension: 'md',
        source: filePath,
        type: 'markdown',
      },
    }));

    return documentsWithMetadata;
  } catch (error) {
    console.error(`Error loading markdown file ${filePath}:`, error);

    return [];
  }
}

/**
 * Load all markdown files in the repository
 */
export async function loadAllMarkdownFiles(): Promise<Document[]> {
  const allDocuments: Document[] = [];
  const markdownFiles = await getFilesByExtension('md');

  console.log(`Found ${markdownFiles.length} markdown files`);

  for (const filePath of markdownFiles) {
    // console.log(`Loading: ${filePath}`);
    const documents = await loadMarkdownFile(filePath);
    allDocuments.push(...documents);
  }

  console.log(`Total documents loaded: ${allDocuments.length}`);

  return allDocuments;
}

/**
 * Load markdown files from specific directories
 */
export async function loadFilesFromDirectories(
  directories: string[],
  extensions: Extension = 'md',
): Promise<Document[]> {
  const allDocuments: Document[] = [];

  for (const directory of directories) {
    const markdownFiles = await getFilesByExtension(extensions);
    const directoryFiles = markdownFiles.filter((file) =>
      file.includes(directory),
    );

    console.log(
      `Found ${directoryFiles.length} markdown files in ${directory}`,
    );

    for (const filePath of directoryFiles) {
      console.log(`Loading: ${filePath}`);
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
  totalDocuments: number;
  totalCharacters: number;
  averageDocumentLength: number;
  sources: string[];
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
