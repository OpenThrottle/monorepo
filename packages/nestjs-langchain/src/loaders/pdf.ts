import { Document } from '@langchain/core/dist/documents';
import { PDFLoader } from '@langchain/community/dist/document_loaders/fs/pdf';

/**
 * @description Load a single PDF file using LangChain's PDFLoader
 */
export async function loadPDF(filePath: string): Promise<Document[]> {
  try {
    const loader = new PDFLoader(filePath);

    // FIXME: part of upgrading
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
  } catch (error) {
    console.error(`🚨 Error loading PDF file ${filePath}:`, error);

    return [];
  }
}
