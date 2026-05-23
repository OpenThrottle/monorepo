/**
 * @description Shared types for user-upload document parsing into a neutral tree.
 * Mapping to Plan → Task → Requirement happens in a later stage after the parse pipeline runs.
 */

/** Supported upload kinds for the Cortex document parse pipeline. */
export const DOCUMENT_UPLOAD_FORMATS = {
  csv: 'csv',
  html: 'html',
  json: 'json',
  markdown: 'markdown',
  xlsx: 'xlsx',
} as const;

export type DocumentUploadFormat =
  (typeof DOCUMENT_UPLOAD_FORMATS)[keyof typeof DOCUMENT_UPLOAD_FORMATS];

/** One structural unit after format-specific extraction (pre-mapping). */
export type CortexParseBlock =
  | {
      readonly kind: 'heading';
      readonly level: number;
      readonly text: string;
    }
  | {
      readonly depth: number;
      readonly kind: 'list_item';
      readonly text: string;
    }
  | {
      readonly kind: 'paragraph';
      readonly text: string;
    }
  | {
      readonly headers: readonly string[];
      readonly kind: 'table';
      readonly rows: readonly (readonly string[])[];
    };

/**
 * @description Canonical intermediate representation produced by extractors.
 * Downstream mapping infers plan title, task boundaries, and requirement rows from {@link CortexParseBlock} lists.
 */
export interface CortexDocumentParseTree {
  readonly blocks: readonly CortexParseBlock[];
  readonly format: DocumentUploadFormat;
}

export interface DocumentParseHints {
  /** MIME type from multipart upload when available. */
  readonly mimeType: string | undefined;
  /** Original filename for extension-based detection fallback. */
  readonly originalFilename: string | undefined;
}

export interface DocumentParseError {
  readonly code: DocumentParseErrorCode;
  readonly detail: string | undefined;
  readonly format: DocumentUploadFormat | undefined;
  readonly message: string;
}

export type DocumentParseErrorCode =
  (typeof DOCUMENT_PARSE_ERROR_CODES)[keyof typeof DOCUMENT_PARSE_ERROR_CODES];

export const DOCUMENT_PARSE_ERROR_CODES = {
  CSV_MALFORMED: 'CSV_MALFORMED',
  EMPTY_DOCUMENT: 'EMPTY_DOCUMENT',
  FORMAT_AMBIGUOUS: 'FORMAT_AMBIGUOUS',
  FORMAT_UNSUPPORTED: 'FORMAT_UNSUPPORTED',
  HTML_PARSE_FAILED: 'HTML_PARSE_FAILED',
  JSON_NOT_OBJECT_OR_ARRAY: 'JSON_NOT_OBJECT_OR_ARRAY',
  JSON_SYNTAX: 'JSON_SYNTAX',
  MARKDOWN_EMPTY: 'MARKDOWN_EMPTY',
  WORKBOOK_EMPTY: 'WORKBOOK_EMPTY',
  WORKBOOK_NO_SHEETS: 'WORKBOOK_NO_SHEETS',
  XLSX_CORRUPT: 'XLSX_CORRUPT',
} as const;

export type CortexDocumentParseResult =
  | { readonly error: DocumentParseError; readonly ok: false }
  | { readonly ok: true; readonly value: CortexDocumentParseTree };
