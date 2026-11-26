import { describe, expect, it } from 'vitest';

import type { ConversationStreamChunkPayload } from './conversation-stream.types.ts';
import {
  compactReplayChunks,
  composeCursorStartupErrorText,
} from './conversation-stream.utils.ts';

const chunk = (
  sortOrder: number,
  overrides: Partial<ConversationStreamChunkPayload> = {},
): ConversationStreamChunkPayload => {
  return {
    conversationId: 'conv-1',
    delta: `d${sortOrder} `,
    done: false,
    error: null,
    id: `chunk-${sortOrder}`,
    kind: 'text',
    messageId: 'assistant-1',
    metadataJson: null,
    sortOrder,
    ...overrides,
  };
};

describe('compactReplayChunks', () => {
  it('folds consecutive text deltas of the head into their first chunk', () => {
    const chunks = [chunk(0), chunk(1), chunk(2), chunk(3)];

    const compacted = compactReplayChunks(chunks, 1);

    expect(compacted).toEqual([{ ...chunk(0), delta: 'd0 d1 d2 ' }, chunk(3)]);
  });

  it('keeps the reply from its first word', () => {
    const chunks = Array.from({ length: 6000 }, (_, index) => chunk(index));

    const compacted = compactReplayChunks(chunks, 500);

    expect(compacted).toHaveLength(501);
    expect(compacted[0]?.sortOrder).toBe(0);
    expect(compacted.map((item) => item.delta).join('')).toBe(
      chunks.map((item) => item.delta).join(''),
    );
  });

  it('never folds across a tool event, a kind change or another message', () => {
    const tool = chunk(1, { delta: '', kind: 'tool_call', metadataJson: '{}' });
    const thinking = chunk(3, { kind: 'thinking' });
    const otherMessage = chunk(4, { messageId: 'assistant-2' });
    const chunks = [chunk(0), tool, chunk(2), thinking, otherMessage, chunk(5)];

    expect(compactReplayChunks(chunks, 0)).toEqual(chunks);
  });

  it('leaves the tail untouched, so replayed and live copies still dedupe', () => {
    const chunks = [chunk(0), chunk(1), chunk(2)];

    expect(compactReplayChunks(chunks, 2)).toEqual(chunks);
  });
});

// Captured verbatim off cursor-agent 2026.08.11 during the task 1 evidence gate.
const REAL_AUTH_REQUIRED = `Error: Authentication required. Please run 'agent login' first, or set CURSOR_API_KEY environment variable.`;
const REAL_INVALID_KEY = `\u001b[33m! Warning: The provided API key is invalid.\u001b[0m\nThe API key was loaded from the CURSOR_API_KEY environment variable.`;

describe('composeCursorStartupErrorText', () => {
  it('tells an unauthenticated user to log in, naming the command', () => {
    const text = composeCursorStartupErrorText(REAL_AUTH_REQUIRED);

    expect(text).toContain('cursor-agent login');
    expect(text).toContain('send this message again');
  });

  it('treats an invalid API key as an auth problem, not a transient blip', () => {
    expect(composeCursorStartupErrorText(REAL_INVALID_KEY)).toContain(
      'cursor-agent login',
    );
  });

  it('names the install command when the binary is missing', () => {
    const text = composeCursorStartupErrorText('spawn cursor-agent ENOENT');

    expect(text).toContain('not installed');
    expect(text).toContain('OPENTHROTTLE_CURSOR_AGENT_BIN');
  });

  it('says a timeout is usually a cold start and is worth retrying', () => {
    const text = composeCursorStartupErrorText(
      'cursor-agent create-chat timed out after 30000ms bin=/x cwd=/y',
    );

    expect(text).toContain('cold start');
  });

  it('falls back to copy that points at the server logs', () => {
    const text = composeCursorStartupErrorText('exited with code 3');

    expect(text).toContain('server logs');
  });

  it('strips ANSI escapes, which previously reached the composer verbatim', () => {
    const text = composeCursorStartupErrorText(REAL_INVALID_KEY);

    expect(text).not.toContain('\u001b');
    expect(text).not.toContain('[33m');
  });

  it('keeps the raw message as a detail line so a misclassification still diagnoses', () => {
    const text = composeCursorStartupErrorText('exited with code 3');

    expect(text).toContain('Details: exited with code 3');
  });

  it('truncates a very long raw message rather than flooding the thread', () => {
    const text = composeCursorStartupErrorText('x'.repeat(500));

    expect(text.length).toBeLessThan(500);
    expect(text).toContain('…');
  });

  it('omits the detail line entirely when there is no raw message', () => {
    const text = composeCursorStartupErrorText('   ');

    expect(text).not.toContain('Details:');
    expect(text).toContain('server logs');
  });
});
