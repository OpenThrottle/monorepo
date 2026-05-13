import type {
  DocumentParseError,
  DocumentParseErrorCode,
  DocumentUploadFormat,
} from './cortex-document-parse.types';
import { DOCUMENT_PARSE_ERROR_CODES } from './cortex-document-parse.types';

const FORMAT_LABEL: Record<DocumentUploadFormat, string> = {
  csv: 'CSV',
  html: 'HTML',
  json: 'JSON',
  markdown: 'Markdown',
  xlsx: 'Excel',
};

/**
 * @description Stable, user-facing copy for GraphQL / UI. Keep identifiers in {@link DOCUMENT_PARSE_ERROR_CODES}.
 */
const BASE_MESSAGES: Record<DocumentParseErrorCode, string> = {
  [DOCUMENT_PARSE_ERROR_CODES.CSV_MALFORMED]:
    'The CSV file could not be read. Check quoting, delimiters, and that the file is valid UTF-8 text.',
  [DOCUMENT_PARSE_ERROR_CODES.EMPTY_DOCUMENT]: 'The uploaded file is empty.',
  [DOCUMENT_PARSE_ERROR_CODES.FORMAT_AMBIGUOUS]:
    'Could not determine file type from the name or content type. Use a supported extension or MIME type.',
  [DOCUMENT_PARSE_ERROR_CODES.FORMAT_UNSUPPORTED]:
    'This file type is not supported for Cortex document import.',
  [DOCUMENT_PARSE_ERROR_CODES.HTML_PARSE_FAILED]:
    'The HTML file could not be parsed.',
  [DOCUMENT_PARSE_ERROR_CODES.JSON_NOT_OBJECT_OR_ARRAY]:
    'JSON uploads must be a JSON object or array at the top level.',
  [DOCUMENT_PARSE_ERROR_CODES.JSON_SYNTAX]:
    'The file is not valid JSON (syntax error near the reported location).',
  [DOCUMENT_PARSE_ERROR_CODES.MARKDOWN_EMPTY]:
    'No readable Markdown structure was found (add headings or paragraphs).',
  [DOCUMENT_PARSE_ERROR_CODES.WORKBOOK_EMPTY]:
    'The spreadsheet has no usable cells.',
  [DOCUMENT_PARSE_ERROR_CODES.WORKBOOK_NO_SHEETS]:
    'The Excel workbook contains no sheets.',
  [DOCUMENT_PARSE_ERROR_CODES.XLSX_CORRUPT]:
    'The Excel file could not be read. It may be corrupted or not a real .xlsx file.',
};

/**
 * @description Builds a {@link DocumentParseError} with optional parser-specific detail (logged-safe; avoid raw PII).
 */
export const buildDocumentParseError = (input: {
  readonly code: DocumentParseErrorCode;
  readonly detail?: string | undefined;
  readonly format: DocumentUploadFormat | undefined;
}): DocumentParseError => {
  const base = BASE_MESSAGES[input.code];
  const label = input.format != null ? `${FORMAT_LABEL[input.format]}: ` : '';
  const message =
    input.detail != null && input.detail.length > 0
      ? `${label}${base} (${input.detail})`
      : `${label}${base}`;
  return {
    code: input.code,
    detail: input.detail,
    format: input.format,
    message,
  };
};
