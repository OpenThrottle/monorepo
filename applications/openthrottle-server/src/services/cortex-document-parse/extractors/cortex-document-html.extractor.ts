import { load } from 'cheerio';
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

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * @description HTML via Cheerio: document-order `h*`, `p`, `li`, `table` → {@link CortexParseBlock} list. Scripts/styles stripped.
 */
export const extractCortexBlocksFromHtml = (
  utf8Text: string,
): CortexDocumentParseResult => {
  const trimmed = utf8Text.trim();
  if (trimmed.length === 0) {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.EMPTY_DOCUMENT,
        format: DOCUMENT_UPLOAD_FORMATS.html,
      }),
      ok: false,
    };
  }

  try {
    const $ = load(trimmed);
    $('script, style, noscript').remove();

    const blocks: CortexParseBlock[] = [];

    $('h1,h2,h3,h4,h5,h6,p,li,table').each((_, el) => {
      const tag = el.tagName?.toLowerCase() ?? '';

      if (tag === 'table') {
        const headers: string[] = [];
        const rows: string[][] = [];
        let rowIndex = 0;
        $(el)
          .find('tr')
          .each((__, tr) => {
            const cells = $(tr)
              .find('th, td')
              .map((___, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
              .get() as string[];
            if (cells.length === 0) {
              return;
            }
            const hasTh = $(tr).find('th').length > 0;
            if (rowIndex === 0 && hasTh) {
              headers.push(...cells);
            } else {
              rows.push(cells);
            }
            rowIndex += 1;
          });
        if (headers.length > 0 || rows.length > 0) {
          blocks.push({
            headers: headers.length > 0 ? headers : (rows[0] ?? []),
            kind: 'table',
            rows: headers.length > 0 ? rows : rows.slice(1),
          });
        }
        return;
      }

      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length === 0) {
        return;
      }

      if (HEADING_TAGS.has(tag)) {
        const level = Number(tag[1]);
        blocks.push({
          kind: 'heading',
          level: Number.isFinite(level) ? level : 1,
          text,
        });
        return;
      }

      if (tag === 'li') {
        blocks.push({ depth: 0, kind: 'list_item', text });
        return;
      }

      blocks.push({ kind: 'paragraph', text });
    });

    if (blocks.length === 0) {
      return {
        error: buildDocumentParseError({
          code: DOCUMENT_PARSE_ERROR_CODES.HTML_PARSE_FAILED,
          detail: 'no headings, paragraphs, lists, or tables found',
          format: DOCUMENT_UPLOAD_FORMATS.html,
        }),
        ok: false,
      };
    }

    const tree: CortexDocumentParseTree = {
      blocks,
      format: DOCUMENT_UPLOAD_FORMATS.html,
    };
    return { ok: true, value: tree };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.HTML_PARSE_FAILED,
        detail: msg.slice(0, 200),
        format: DOCUMENT_UPLOAD_FORMATS.html,
      }),
      ok: false,
    };
  }
};
