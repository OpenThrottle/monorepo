import type { Document } from '@langchain/core/documents';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';

import { assertSafeWebURL } from './url-guard';

/**
 * @link https://js.langchain.com/docs/integrations/document_loaders/web_loaders/web_cheerio/
 *
 * SSRF guard: the URL is validated for an http/https scheme and rejected if it
 * targets a loopback, private, link-local, or cloud-metadata host before any
 * fetch happens. See {@link assertSafeWebURL} for residual DNS-rebinding caveats.
 */
export async function loadWebURL(url: string): Promise<Document[]> {
  assertSafeWebURL(url);

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

  return contentWithMetadata;
}
