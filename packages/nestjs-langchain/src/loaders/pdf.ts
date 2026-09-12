import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import type { Document } from '@langchain/core/documents';

/**
 * @description Load a single PDF file using LangChain's PDFLoader
 */
export async function loadPDF(filePath: string): Promise<Document[]> {
  const loader = new PDFLoader(filePath);

  const documents = await loader.load();

  // Add metadata about the file
  const documentsWithMetadata = documents.map((doc: Document) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      extension: 'pdf',
      source: filePath,
      type: 'pdf',
    },
  }));

  return documentsWithMetadata;
}
