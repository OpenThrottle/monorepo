/**
 * @description Unit tests for format-specific Cortex document extractors.
 */

import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { DOCUMENT_PARSE_ERROR_CODES } from '../cortex-document-parse.types';
import { extractCortexBlocksFromCsv } from './cortex-document-csv.extractor';
import { extractCortexBlocksFromHtml } from './cortex-document-html.extractor';
import { extractCortexBlocksFromJson } from './cortex-document-json.extractor';
import { extractCortexBlocksFromMarkdown } from './cortex-document-markdown.extractor';
import { extractCortexBlocksFromXlsx } from './cortex-document-xlsx.extractor';

describe('extractCortexBlocksFromMarkdown', () => {
  describe('when the document is empty after trim', () => {
    it('returns EMPTY_DOCUMENT', () => {
      const r = extractCortexBlocksFromMarkdown('   \n  ');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.EMPTY_DOCUMENT);
      }
    });
  });

  describe('when markdown parses to no extractable blocks', () => {
    it('returns MARKDOWN_EMPTY', () => {
      const r = extractCortexBlocksFromMarkdown('---\n');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.MARKDOWN_EMPTY);
      }
    });
  });

  describe('when headings and a paragraph exist', () => {
    it('returns blocks', () => {
      const r = extractCortexBlocksFromMarkdown('# T\n\nBody.');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.blocks.some((b) => b.kind === 'heading')).toBe(true);
        expect(r.value.blocks.some((b) => b.kind === 'paragraph')).toBe(true);
      }
    });
  });
});

describe('extractCortexBlocksFromJson', () => {
  describe('when JSON is a bare number', () => {
    it('returns JSON_NOT_OBJECT_OR_ARRAY', () => {
      const r = extractCortexBlocksFromJson('42');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe(
          DOCUMENT_PARSE_ERROR_CODES.JSON_NOT_OBJECT_OR_ARRAY,
        );
      }
    });
  });

  describe('when JSON is an object with string values', () => {
    it('returns heading blocks per key', () => {
      const r = extractCortexBlocksFromJson('{"z":"last","a":"first"}');
      expect(r.ok).toBe(true);
      if (r.ok) {
        const headings = r.value.blocks.filter((b) => b.kind === 'heading');
        expect(headings[0]?.text).toBe('a');
        expect(headings[1]?.text).toBe('z');
      }
    });
  });
});

describe('extractCortexBlocksFromCsv', () => {
  describe('when CSV has a header and one row', () => {
    it('returns a single table block', () => {
      const r = extractCortexBlocksFromCsv('Task,Req\nOne,Do one');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.blocks).toHaveLength(1);
        const t = r.value.blocks[0];
        expect(t?.kind).toBe('table');
        if (t?.kind === 'table') {
          expect(t.headers).toEqual(['Task', 'Req']);
          expect(t.rows).toEqual([['One', 'Do one']]);
        }
      }
    });
  });

  describe('when CSV has a quoting error', () => {
    it('returns CSV_MALFORMED', () => {
      const r = extractCortexBlocksFromCsv('a\n"open');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.CSV_MALFORMED);
      }
    });
  });
});

describe('extractCortexBlocksFromHtml', () => {
  describe('when the document has no extractable content nodes', () => {
    it('returns HTML_PARSE_FAILED', () => {
      const r = extractCortexBlocksFromHtml(
        '<html><body><div></div></body></html>',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.HTML_PARSE_FAILED);
      }
    });
  });

  describe('when the document has an h1', () => {
    it('returns a heading block', () => {
      const r = extractCortexBlocksFromHtml('<h1>Title</h1>');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.blocks[0]).toEqual({
          kind: 'heading',
          level: 1,
          text: 'Title',
        });
      }
    });
  });
});

describe('extractCortexBlocksFromXlsx', () => {
  describe('when the buffer is not a valid workbook', () => {
    it('returns XLSX_CORRUPT', () => {
      /** Truncated ZIP local header — SheetJS throws "Unsupported ZIP file". */
      const corrupt = Buffer.from([
        0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00,
      ]);
      const r = extractCortexBlocksFromXlsx(corrupt);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.XLSX_CORRUPT);
      }
    });
  });

  describe('when the workbook has one populated sheet', () => {
    it('returns a table block', () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['A', 'B'],
        ['1', '2'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'S1');
      const buf = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'buffer',
      }) as Buffer;
      const r = extractCortexBlocksFromXlsx(buf);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.blocks[0]?.kind).toBe('table');
      }
    });
  });
});
