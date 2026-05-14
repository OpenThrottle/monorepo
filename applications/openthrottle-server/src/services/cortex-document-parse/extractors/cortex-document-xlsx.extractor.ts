import * as XLSX from 'xlsx';
import { buildDocumentParseError } from '../cortex-document-parse.errors';
import type {
  CortexDocumentParseResult,
  CortexDocumentParseTree,
  CortexParseBlock,
} from '../cortex-document-parse.types';
import {
  DOCUMENT_PARSE_ERROR_CODES,
  DOCUMENT_UPLOAD_FORMATS,
} from '../cortex-document-parse.types';

/**
 * @description First worksheet via SheetJS (`xlsx`): rows → one {@link CortexParseBlock} `table` (header row = first row).
 */
export const extractCortexBlocksFromXlsx = (
  buffer: Buffer,
): CortexDocumentParseResult => {
  if (buffer.length === 0) {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.EMPTY_DOCUMENT,
        format: DOCUMENT_UPLOAD_FORMATS.xlsx,
      }),
      ok: false,
    };
  }

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (sheetName == null || sheetName.length === 0) {
      return {
        error: buildDocumentParseError({
          code: DOCUMENT_PARSE_ERROR_CODES.WORKBOOK_NO_SHEETS,
          format: DOCUMENT_UPLOAD_FORMATS.xlsx,
        }),
        ok: false,
      };
    }

    const sheet = workbook.Sheets[sheetName];
    if (sheet == null) {
      return {
        error: buildDocumentParseError({
          code: DOCUMENT_PARSE_ERROR_CODES.WORKBOOK_NO_SHEETS,
          detail: 'first sheet missing',
          format: DOCUMENT_UPLOAD_FORMATS.xlsx,
        }),
        ok: false,
      };
    }

    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      sheet,
      { defval: '', header: 1, raw: false },
    ) as (string | number | boolean | null)[][];

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        error: buildDocumentParseError({
          code: DOCUMENT_PARSE_ERROR_CODES.WORKBOOK_EMPTY,
          format: DOCUMENT_UPLOAD_FORMATS.xlsx,
        }),
        ok: false,
      };
    }

    const normalized = rows
      .map((r) => r.map((c) => String(c ?? '').trim()))
      .filter((r) => r.some((c) => c.length > 0));

    if (normalized.length === 0) {
      return {
        error: buildDocumentParseError({
          code: DOCUMENT_PARSE_ERROR_CODES.WORKBOOK_EMPTY,
          format: DOCUMENT_UPLOAD_FORMATS.xlsx,
        }),
        ok: false,
      };
    }

    const headers = normalized[0] ?? [];
    const body = normalized.slice(1);
    const blocks: CortexParseBlock[] = [
      {
        headers,
        kind: 'table',
        rows: body,
      },
    ];

    const tree: CortexDocumentParseTree = {
      blocks,
      format: DOCUMENT_UPLOAD_FORMATS.xlsx,
    };
    return { ok: true, value: tree };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.XLSX_CORRUPT,
        detail: msg.slice(0, 200),
        format: DOCUMENT_UPLOAD_FORMATS.xlsx,
      }),
      ok: false,
    };
  }
};
