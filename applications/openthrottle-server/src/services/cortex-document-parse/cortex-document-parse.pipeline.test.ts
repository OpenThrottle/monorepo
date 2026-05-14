import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { parseCortexUploadDocument } from './cortex-document-parse.pipeline';
import { DOCUMENT_PARSE_ERROR_CODES } from './cortex-document-parse.types';

describe('parseCortexUploadDocument', () => {
  describe('if format cannot be resolved from hints', () => {
    it('returns FORMAT_AMBIGUOUS', () => {
      const result = parseCortexUploadDocument(Buffer.from('# Hi'), {
        mimeType: undefined,
        originalFilename: undefined,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(
          DOCUMENT_PARSE_ERROR_CODES.FORMAT_AMBIGUOUS,
        );
      }
    });
  });

  describe('if markdown', () => {
    it('extracts headings and paragraphs', () => {
      const md = '# Plan\n\nFirst task body.\n\n- item one\n';
      const result = parseCortexUploadDocument(Buffer.from(md, 'utf8'), {
        mimeType: 'text/markdown',
        originalFilename: 'doc.md',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.format).toBe('markdown');
        const kinds = result.value.blocks.map((b) => b.kind);
        expect(kinds).toContain('heading');
        expect(kinds).toContain('paragraph');
        expect(kinds).toContain('list_item');
      }
    });
  });

  describe('if json', () => {
    it('returns JSON_SYNTAX for invalid json', () => {
      const result = parseCortexUploadDocument(Buffer.from('{', 'utf8'), {
        mimeType: 'application/json',
        originalFilename: 'x.json',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.JSON_SYNTAX);
      }
    });

    it('maps object keys to headings', () => {
      const result = parseCortexUploadDocument(
        Buffer.from(JSON.stringify({ Alpha: 'one', Beta: 'two' }), 'utf8'),
        {
          mimeType: 'application/json',
          originalFilename: 'spec.json',
        },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(
          result.value.blocks.filter((b) => b.kind === 'heading'),
        ).toHaveLength(2);
      }
    });
  });

  describe('if csv', () => {
    it('returns CSV_MALFORMED for unclosed quote', () => {
      const bad = 'a,b\n"unclosed';
      const result = parseCortexUploadDocument(Buffer.from(bad, 'utf8'), {
        mimeType: 'text/csv',
        originalFilename: 'bad.csv',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(
          DOCUMENT_PARSE_ERROR_CODES.CSV_MALFORMED,
        );
      }
    });
  });

  describe('if html', () => {
    it('extracts heading and paragraph', () => {
      const html =
        '<html><body><h1>T</h1><p>Body</p><script>evil()</script></body></html>';
      const result = parseCortexUploadDocument(Buffer.from(html, 'utf8'), {
        mimeType: 'text/html',
        originalFilename: 'x.html',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const textJoined = result.value.blocks.map((b) =>
          b.kind === 'heading' || b.kind === 'paragraph' ? b.text : '',
        );
        expect(textJoined.join(' ')).not.toContain('evil');
      }
    });
  });

  describe('if xlsx', () => {
    it('reads first sheet as a table', () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Task', 'Requirement'],
        ['A', 'Do A'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buf = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'buffer',
      }) as Buffer;
      const result = parseCortexUploadDocument(buf, {
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalFilename: 'plan.xlsx',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.blocks[0]?.kind).toBe('table');
      }
    });
  });
});
