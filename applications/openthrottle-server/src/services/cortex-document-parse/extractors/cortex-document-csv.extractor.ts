import { parse } from 'csv-parse/sync';
import { buildDocumentParseError } from '../cortex-document-parse.errors';
import type {
  CortexDocumentParseResult,
  CortexDocumentParseTree,
} from '../cortex-document-parse.types';
import {
  DOCUMENT_PARSE_ERROR_CODES,
  DOCUMENT_UPLOAD_FORMATS,
} from '../cortex-document-parse.types';

/**
 * @description CSV → table block (header row + data rows). Uses `csv-parse` with relaxed column rules.
 */
export const extractCortexBlocksFromCsv = (
  utf8Text: string,
): CortexDocumentParseResult => {
  const trimmed = utf8Text.trim();
  if (trimmed.length === 0) {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.EMPTY_DOCUMENT,
        format: DOCUMENT_UPLOAD_FORMATS.csv,
      }),
      ok: false,
    };
  }

  try {
    const rowsUnknown = parse(trimmed, {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as unknown;

    if (!Array.isArray(rowsUnknown) || rowsUnknown.length === 0) {
      return {
        error: buildDocumentParseError({
          code: DOCUMENT_PARSE_ERROR_CODES.CSV_MALFORMED,
          detail: 'no rows after parse',
          format: DOCUMENT_UPLOAD_FORMATS.csv,
        }),
        ok: false,
      };
    }

    const rows = rowsUnknown as string[][];
    const headers = (rows[0] ?? []).map((c) => String(c ?? ''));
    const body = rows.slice(1).map((r) => r.map((c) => String(c ?? '')));

    const tree: CortexDocumentParseTree = {
      blocks: [
        {
          headers,
          kind: 'table',
          rows: body,
        },
      ],
      format: DOCUMENT_UPLOAD_FORMATS.csv,
    };
    return { ok: true, value: tree };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.CSV_MALFORMED,
        detail: msg.slice(0, 200),
        format: DOCUMENT_UPLOAD_FORMATS.csv,
      }),
      ok: false,
    };
  }
};
