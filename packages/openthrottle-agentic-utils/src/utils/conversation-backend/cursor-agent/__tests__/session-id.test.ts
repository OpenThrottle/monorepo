import { describe, expect, it } from 'vitest';

import { parseCursorChatId } from '../session-id.ts';

const ID = '05dbda6a-4b19-4862-b4fc-205c78affb66';

describe('parseCursorChatId', () => {
  it('parses the clean single-line output cursor emits today', () => {
    expect(parseCursorChatId(`${ID}\n`)).toBe(ID);
  });

  it('parses an id preceded by an update banner', () => {
    expect(parseCursorChatId(`Update available! 1.2.3\n${ID}\n`)).toBe(ID);
  });

  it('parses an id wrapped in ANSI color codes', () => {
    expect(parseCursorChatId(`\u001b[32m${ID}\u001b[0m\n`)).toBe(ID);
  });

  it('parses an id with CRLF line endings', () => {
    expect(parseCursorChatId(`banner\r\n${ID}\r\n`)).toBe(ID);
  });

  it('strips a leading BOM', () => {
    expect(parseCursorChatId(`\uFEFF${ID}\n`)).toBe(ID);
  });

  it('prefers the last id when several lines match, since banners print first', () => {
    const second = 'ad146bea-a62f-4d76-9754-1f80237b6dba';
    expect(parseCursorChatId(`${ID}\n${second}\n`)).toBe(second);
  });

  it('prefers a UUID over an opaque token even when the token comes last', () => {
    expect(parseCursorChatId(`${ID}\nsome.other.token.value\n`)).toBe(ID);
  });

  it('falls back to an opaque token when no UUID is present', () => {
    // Guards against a future cursor release that stops minting UUIDs.
    expect(parseCursorChatId('chat_01HZX9Y2Q3R4S5T6U7V8W9\n')).toBe(
      'chat_01HZX9Y2Q3R4S5T6U7V8W9',
    );
  });

  it('returns null for output with no id at all', () => {
    expect(parseCursorChatId('Update available! 1.2.3\n')).toBeNull();
  });

  it('returns null for empty and whitespace-only output', () => {
    expect(parseCursorChatId('')).toBeNull();
    expect(parseCursorChatId('   \n\r\n  ')).toBeNull();
  });

  it('rejects a multi-word banner line that would otherwise be trusted verbatim', () => {
    // The exact string that a naive `stdout.trim()` would have handed to
    // `--resume`, which cursor accepts and silently forks the chat on.
    expect(parseCursorChatId('Update available!  1.2.3')).toBeNull();
  });

  it('rejects a token too short to plausibly be an id', () => {
    expect(parseCursorChatId('ok\n')).toBeNull();
  });
});
