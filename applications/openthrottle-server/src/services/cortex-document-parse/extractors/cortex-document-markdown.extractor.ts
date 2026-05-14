import MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it';
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

const md = new MarkdownIt('commonmark', { html: false, linkify: false });

/**
 * @description Markdown via `markdown-it` token stream (CommonMark). Headings, paragraphs, lists, and fenced code → blocks.
 * GitHub-flavored pipe tables are not enabled yet (add a GFM plugin in a follow-up if needed).
 */
export const extractCortexBlocksFromMarkdown = (
  utf8Text: string,
): CortexDocumentParseResult => {
  const trimmed = utf8Text.trim();
  if (trimmed.length === 0) {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.EMPTY_DOCUMENT,
        format: DOCUMENT_UPLOAD_FORMATS.markdown,
      }),
      ok: false,
    };
  }

  const tokens = md.parse(trimmed, {});
  const blocks: CortexParseBlock[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t == null) {
      continue;
    }

    if (t.type === 'heading_open' && t.tag != null && /^h[1-6]$/.test(t.tag)) {
      const level = Number(t.tag[1]);
      const inline = tokens[i + 1];
      const close = tokens[i + 2];
      const text =
        inline?.type === 'inline' && typeof inline.content === 'string'
          ? inline.content.trim()
          : '';
      if (close?.type === 'heading_close') {
        blocks.push({
          kind: 'heading',
          level: Number.isFinite(level) ? level : 1,
          text,
        });
        i += 2;
      }
      continue;
    }

    if (t.type === 'paragraph_open') {
      const inline = tokens[i + 1];
      const close = tokens[i + 2];
      const text =
        inline?.type === 'inline' && typeof inline.content === 'string'
          ? inline.content.trim()
          : '';
      if (close?.type === 'paragraph_close' && text.length > 0) {
        blocks.push({ kind: 'paragraph', text });
        i += 2;
      }
      continue;
    }

    if (t.type === 'fence') {
      const content = typeof t.content === 'string' ? t.content.trim() : '';
      if (content.length > 0) {
        blocks.push({ kind: 'paragraph', text: content });
      }
      continue;
    }

    if (t.type === 'bullet_list_open' || t.type === 'ordered_list_open') {
      const depth = typeof t.level === 'number' ? t.level : 0;
      const listBlocks = collectListItems(tokens, i, depth);
      blocks.push(...listBlocks.blocks);
      i = listBlocks.nextIndex - 1;
    }
  }

  if (blocks.length === 0) {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.MARKDOWN_EMPTY,
        format: DOCUMENT_UPLOAD_FORMATS.markdown,
      }),
      ok: false,
    };
  }

  const tree: CortexDocumentParseTree = {
    blocks,
    format: DOCUMENT_UPLOAD_FORMATS.markdown,
  };
  return { ok: true, value: tree };
};

const collectListItems = (
  tokens: readonly Token[],
  start: number,
  depth: number,
): { readonly blocks: CortexParseBlock[]; readonly nextIndex: number } => {
  const blocks: CortexParseBlock[] = [];
  let i = start + 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t == null) {
      i += 1;
      continue;
    }
    if (t.type === 'bullet_list_close' || t.type === 'ordered_list_close') {
      return { blocks, nextIndex: i + 1 };
    }
    if (t.type === 'list_item_open') {
      const inline = findInlineInListItem(tokens, i);
      const text =
        inline != null &&
        inline.type === 'inline' &&
        typeof inline.content === 'string'
          ? inline.content.trim()
          : '';
      if (text.length > 0) {
        blocks.push({ depth, kind: 'list_item', text });
      }
      i = skipListItem(tokens, i);
      continue;
    }
    if (t.type === 'bullet_list_open' || t.type === 'ordered_list_open') {
      const nested = collectListItems(tokens, i, depth + 1);
      blocks.push(...nested.blocks);
      i = nested.nextIndex;
      continue;
    }
    i += 1;
  }
  return { blocks, nextIndex: tokens.length };
};

const findInlineInListItem = (
  tokens: readonly Token[],
  itemOpenIndex: number,
): Token | undefined => {
  for (let j = itemOpenIndex + 1; j < tokens.length; j += 1) {
    const t = tokens[j];
    if (t?.type === 'list_item_close') {
      return undefined;
    }
    if (t?.type === 'inline') {
      return t;
    }
  }
  return undefined;
};

const skipListItem = (
  tokens: readonly Token[],
  itemOpenIndex: number,
): number => {
  let depth = 1;
  for (let j = itemOpenIndex + 1; j < tokens.length; j += 1) {
    const t = tokens[j];
    if (t?.type === 'list_item_open') {
      depth += 1;
    } else if (t?.type === 'list_item_close') {
      depth -= 1;
      if (depth === 0) {
        return j + 1;
      }
    }
  }
  return tokens.length;
};
