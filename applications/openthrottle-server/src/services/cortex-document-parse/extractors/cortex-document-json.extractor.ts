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
 * @description JSON → blocks: supports top-level string, string[], object map (key→paragraph), or array of `{ title, description? }`.
 */
export const extractCortexBlocksFromJson = (
  utf8Text: string,
): CortexDocumentParseResult => {
  const trimmed = utf8Text.trim();
  if (trimmed.length === 0) {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.EMPTY_DOCUMENT,
        format: DOCUMENT_UPLOAD_FORMATS.json,
      }),
      ok: false,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch (e) {
    const loc =
      e instanceof SyntaxError && e.message.length > 0
        ? e.message
        : 'syntax error';
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.JSON_SYNTAX,
        detail: loc.slice(0, 200),
        format: DOCUMENT_UPLOAD_FORMATS.json,
      }),
      ok: false,
    };
  }

  const blocks: CortexParseBlock[] = [];

  if (typeof parsed === 'string') {
    const text = parsed.trim();
    if (text.length > 0) {
      blocks.push({ kind: 'paragraph', text });
    }
  } else if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (typeof item === 'string') {
        const text = item.trim();
        if (text.length > 0) {
          blocks.push({ kind: 'paragraph', text });
        }
      } else if (
        item != null &&
        typeof item === 'object' &&
        !Array.isArray(item)
      ) {
        const rec = item as Record<string, unknown>;
        const title = rec.title;
        const description = rec.description ?? rec.body ?? rec.text;
        if (typeof title === 'string' && title.trim().length > 0) {
          blocks.push({ kind: 'heading', level: 2, text: title.trim() });
        }
        if (typeof description === 'string' && description.trim().length > 0) {
          blocks.push({ kind: 'paragraph', text: description.trim() });
        }
      }
    }
  } else if (parsed != null && typeof parsed === 'object') {
    const entries = Object.entries(parsed as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    for (const [key, value] of entries) {
      blocks.push({ kind: 'heading', level: 2, text: key });
      if (typeof value === 'string') {
        const text = value.trim();
        if (text.length > 0) {
          blocks.push({ kind: 'paragraph', text });
        }
      } else if (value != null && typeof value === 'object') {
        blocks.push({
          kind: 'paragraph',
          text: JSON.stringify(value, null, 2).slice(0, 50_000),
        });
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        blocks.push({ kind: 'paragraph', text: String(value) });
      }
    }
  } else {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.JSON_NOT_OBJECT_OR_ARRAY,
        format: DOCUMENT_UPLOAD_FORMATS.json,
      }),
      ok: false,
    };
  }

  if (blocks.length === 0) {
    return {
      error: buildDocumentParseError({
        code: DOCUMENT_PARSE_ERROR_CODES.JSON_NOT_OBJECT_OR_ARRAY,
        detail: 'no extractable text after parsing',
        format: DOCUMENT_UPLOAD_FORMATS.json,
      }),
      ok: false,
    };
  }

  const tree: CortexDocumentParseTree = {
    blocks,
    format: DOCUMENT_UPLOAD_FORMATS.json,
  };
  return { ok: true, value: tree };
};
