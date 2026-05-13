import { DOCUMENT_UPLOAD_FORMATS } from './cortex-document-parse.types';
import type { DocumentUploadFormat } from './cortex-document-parse.types';

const EXTENSION_TO_FORMAT: Readonly<Record<string, DocumentUploadFormat>> = {
  '.csv': DOCUMENT_UPLOAD_FORMATS.csv,
  '.htm': DOCUMENT_UPLOAD_FORMATS.html,
  '.html': DOCUMENT_UPLOAD_FORMATS.html,
  '.json': DOCUMENT_UPLOAD_FORMATS.json,
  '.md': DOCUMENT_UPLOAD_FORMATS.markdown,
  '.mdown': DOCUMENT_UPLOAD_FORMATS.markdown,
  '.mdx': DOCUMENT_UPLOAD_FORMATS.markdown,
  '.mkd': DOCUMENT_UPLOAD_FORMATS.markdown,
  '.xlsx': DOCUMENT_UPLOAD_FORMATS.xlsx,
};

const MIME_TO_FORMAT: Readonly<Record<string, DocumentUploadFormat>> = {
  'application/json': DOCUMENT_UPLOAD_FORMATS.json,
  'application/vnd.ms-excel': DOCUMENT_UPLOAD_FORMATS.xlsx,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    DOCUMENT_UPLOAD_FORMATS.xlsx,
  'text/csv': DOCUMENT_UPLOAD_FORMATS.csv,
  'text/html': DOCUMENT_UPLOAD_FORMATS.html,
  'text/markdown': DOCUMENT_UPLOAD_FORMATS.markdown,
  'text/x-markdown': DOCUMENT_UPLOAD_FORMATS.markdown,
};

/**
 * @description Resolves {@link DocumentUploadFormat} from MIME type and/or filename extension.
 */
export const resolveDocumentUploadFormat = (input: {
  readonly mimeType: string | undefined;
  readonly originalFilename: string | undefined;
}): DocumentUploadFormat | undefined => {
  const mime = input.mimeType?.split(';')[0]?.trim().toLowerCase();
  if (mime != null && mime.length > 0) {
    const fromMime = MIME_TO_FORMAT[mime];
    if (fromMime != null) {
      return fromMime;
    }
  }

  const name = input.originalFilename?.trim().toLowerCase();
  if (name == null || name.length === 0) {
    return undefined;
  }

  const dot = name.lastIndexOf('.');
  if (dot === -1 || dot === name.length - 1) {
    return undefined;
  }

  const ext = name.slice(dot);
  return EXTENSION_TO_FORMAT[ext];
};
