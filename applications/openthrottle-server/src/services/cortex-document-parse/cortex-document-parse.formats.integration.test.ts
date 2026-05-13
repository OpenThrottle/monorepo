/**
 * @description End-to-end parse pipeline checks per upload format (detection + extractor).
 */

import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { parseCortexUploadDocument } from './cortex-document-parse.pipeline';
import {
  DOCUMENT_PARSE_ERROR_CODES,
  DOCUMENT_UPLOAD_FORMATS,
} from './cortex-document-parse.types';

const xlsxHints = {
  mimeType:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const,
  originalFilename: 'plan.xlsx' as const,
};

describe('parseCortexUploadDocument — per-format happy path', () => {
  it('parses markdown with MIME and filename', () => {
    const md = '# Plan title\n\n## Task one\nBody.\n';
    const r = parseCortexUploadDocument(Buffer.from(md, 'utf8'), {
      mimeType: 'text/markdown',
      originalFilename: 'doc.md',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.format).toBe(DOCUMENT_UPLOAD_FORMATS.markdown);
      expect(r.value.blocks.some((b) => b.kind === 'heading')).toBe(true);
    }
  });

  it('parses JSON with MIME and filename', () => {
    const r = parseCortexUploadDocument(
      Buffer.from(JSON.stringify({ Task: 'desc' }), 'utf8'),
      { mimeType: 'application/json', originalFilename: 't.json' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.format).toBe(DOCUMENT_UPLOAD_FORMATS.json);
    }
  });

  it('parses CSV with MIME and filename', () => {
    const r = parseCortexUploadDocument(
      Buffer.from('Title,Req\nA,Do A', 'utf8'),
      { mimeType: 'text/csv', originalFilename: 'tasks.csv' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.format).toBe(DOCUMENT_UPLOAD_FORMATS.csv);
      expect(r.value.blocks[0]?.kind).toBe('table');
    }
  });

  it('parses HTML with MIME and filename', () => {
    const r = parseCortexUploadDocument(
      Buffer.from('<html><body><h1>H</h1><p>x</p></body></html>', 'utf8'),
      { mimeType: 'text/html', originalFilename: 'n.html' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.format).toBe(DOCUMENT_UPLOAD_FORMATS.html);
    }
  });

  it('parses XLSX with MIME and filename', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Task', 'R'],
      ['T1', 'R1'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const r = parseCortexUploadDocument(buf, xlsxHints);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.format).toBe(DOCUMENT_UPLOAD_FORMATS.xlsx);
    }
  });
});

describe('parseCortexUploadDocument — one failure class per format', () => {
  it('markdown: MARKDOWN_EMPTY for horizontal rule only', () => {
    const r = parseCortexUploadDocument(Buffer.from('---\n', 'utf8'), {
      mimeType: 'text/markdown',
      originalFilename: 'x.md',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.MARKDOWN_EMPTY);
    }
  });

  it('json: JSON_SYNTAX for truncated JSON', () => {
    const r = parseCortexUploadDocument(Buffer.from('{', 'utf8'), {
      mimeType: 'application/json',
      originalFilename: 'bad.json',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.JSON_SYNTAX);
    }
  });

  it('csv: CSV_MALFORMED for broken quoting', () => {
    const r = parseCortexUploadDocument(Buffer.from('a,"b', 'utf8'), {
      mimeType: 'text/csv',
      originalFilename: 'bad.csv',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.CSV_MALFORMED);
    }
  });

  it('html: HTML_PARSE_FAILED when no headings, paragraphs, lists, or tables', () => {
    const r = parseCortexUploadDocument(
      Buffer.from('<html><body></body></html>', 'utf8'),
      { mimeType: 'text/html', originalFilename: 'empty.html' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.HTML_PARSE_FAILED);
    }
  });

  it('xlsx: XLSX_CORRUPT for truncated ZIP local header', () => {
    const corrupt = Buffer.from([
      0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00,
    ]);
    const r = parseCortexUploadDocument(corrupt, xlsxHints);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe(DOCUMENT_PARSE_ERROR_CODES.XLSX_CORRUPT);
    }
  });
});
