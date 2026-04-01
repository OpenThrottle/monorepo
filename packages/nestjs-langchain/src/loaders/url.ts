import { Document } from '@langchain/core/dist/documents';
import { CheerioWebBaseLoader } from '@langchain/community/dist/document_loaders/web/cheerio';

/**
 * @link https://js.langchain.com/docs/integrations/document_loaders/web_loaders/web_cheerio/
 */
export async function loadWebURL(url: string): Promise<Document[]> {
  try {
    const loader = new CheerioWebBaseLoader(url, {
      selector: 'p,h1,h2,h3,h4,h5,h6',
      textDecoder: new TextDecoder('utf-8'),
    });
    const content = await loader.load();

    // Add metadata about the file
    const contentWithMetadata = content.map((doc: Document) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        type: 'webpage',
      },
    }));

    // console.log("📹 contentWithMetadata --> ", contentWithMetadata);

    return contentWithMetadata;
  } catch (error) {
    console.error(`🚨 Error loading Web URL ${url}:`, error);

    return [];
  }
}
