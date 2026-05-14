import { buildDocumentParseError } from './cortex-document-parse.errors';
import { resolveDocumentUploadFormat } from './cortex-document-parse.format-detection';
import type {
  CortexDocumentParseResult,
  DocumentParseHints,
} from './cortex-document-parse.types';
import {
  DOCUMENT_PARSE_ERROR_CODES,
  DOCUMENT_UPLOAD_FORMATS,
} from './cortex-document-parse.types';
import { extractCortexBlocksFromCsv } from './extractors/cortex-document-csv.extractor';
import { extractCortexBlocksFromHtml } from './extractors/cortex-document-html.extractor';
import { extractCortexBlocksFromJson } from './extractors/cortex-document-json.extractor';
import { extractCortexBlocksFromMarkdown } from './extractors/cortex-document-markdown.extractor';
import { extractCortexBlocksFromXlsx } from './extractors/cortex-document-xlsx.extractor';

/**
 * @description Runs MIME/filename detection then the format-specific extractor.
 * Libraries: `csv-parse` (CSV), `xlsx` (Excel), `markdown-it` (Markdown), `cheerio` (HTML), native `JSON.parse` (JSON).
 */
export const parseCortexUploadDocument = (
  buffer: Buffer,
  hints: DocumentParseHints,
): CortexDocumentParseResult => {
  const format = resolveDocumentUploadFormat({
    mimeType: hints.mimeType,
    originalFilename: hints.originalFilename,
  });

  if (format == null) {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.FORMAT_AMBIGUOUS,
        format: undefined,
      }),
      ok: false,
    };
  }

  switch (format) {
    case DOCUMENT_UPLOAD_FORMATS.csv: {
      const text = buffer.toString('utf8');
      return extractCortexBlocksFromCsv(text);
    }
    case DOCUMENT_UPLOAD_FORMATS.html: {
      const text = buffer.toString('utf8');
      return extractCortexBlocksFromHtml(text);
    }
    case DOCUMENT_UPLOAD_FORMATS.json: {
      const text = buffer.toString('utf8');
      return extractCortexBlocksFromJson(text);
    }
    case DOCUMENT_UPLOAD_FORMATS.markdown: {
      const text = buffer.toString('utf8');
      return extractCortexBlocksFromMarkdown(text);
    }
    case DOCUMENT_UPLOAD_FORMATS.xlsx: {
      return extractCortexBlocksFromXlsx(buffer);
    }
    default: {
      return {
        error: buildDocumentParseError({
          code: DOCUMENT_PARSE_ERROR_CODES.FORMAT_UNSUPPORTED,
          format: undefined,
        }),
        ok: false,
      };
    }
  }
};
