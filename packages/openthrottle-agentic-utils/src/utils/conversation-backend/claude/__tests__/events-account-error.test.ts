import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ConversationStreamChunk } from '../../types.ts';
import { mapClaudeEvent } from '../events.ts';

const FIXTURES = join(import.meta.dirname, 'fixtures');

/** Every chunk a recorded `stream-json` fixture maps to, in order. */
const chunksOf = (name: string): readonly ConversationStreamChunk[] => {
  return readFileSync(join(FIXTURES, `${name}.ndjson`), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .flatMap((line) => mapClaudeEvent(JSON.parse(line)));
};

const accountErrorsOf = (
  chunks: readonly ConversationStreamChunk[],
): readonly ConversationStreamChunk[] => {
  return chunks.filter((chunk) => chunk.kind === 'account_error');
};

describe('mapClaudeEvent — fatal account errors', () => {
  describe('an invalid API key', () => {
    const chunks = chunksOf('invalid-api-key.synthetic');

    it('reports the API-key auth source on the session chunk', () => {
      expect(chunks[0]).toMatchObject({
        kind: 'session',
        metadata: { apiKeySource: 'ANTHROPIC_API_KEY' },
      });
    });

    it('emits exactly one authentication account_error chunk', () => {
      expect(accountErrorsOf(chunks)).toEqual([
        {
          delta: '',
          done: false,
          kind: 'account_error',
          metadata: {
            kind: 'authentication_error',
            message: 'Invalid API key · Fix external API key',
          },
        },
      ]);
    });

    it('marks the terminal chunk with the account error', () => {
      expect(chunks.at(-1)).toMatchObject({
        done: true,
        error: 'Invalid API key · Fix external API key',
        metadata: { accountError: { kind: 'authentication_error' } },
      });
    });
  });

  describe('an exhausted credit balance', () => {
    const chunks = chunksOf('credit-balance-too-low.synthetic');

    it('emits exactly one billing account_error chunk', () => {
      expect(accountErrorsOf(chunks)).toEqual([
        {
          delta: '',
          done: false,
          kind: 'account_error',
          metadata: {
            kind: 'billing_error',
            message: 'Credit balance is too low',
          },
        },
      ]);
    });

    it('does not mark a 400 terminal result on its own', () => {
      expect(chunks.at(-1)?.metadata).not.toHaveProperty('accountError');
    });
  });

  it('maps a permission_error API-error message', () => {
    expect(
      mapClaudeEvent({
        error: 'permission_error',
        isApiErrorMessage: true,
        message: { content: [{ text: 'no access', type: 'text' }] },
        type: 'assistant',
      }),
    ).toEqual([
      {
        delta: '',
        done: false,
        kind: 'account_error',
        metadata: { kind: 'permission_error', message: 'no access' },
      },
    ]);
  });

  it('does not map a non-fatal API-error message', () => {
    expect(
      mapClaudeEvent({
        error: 'server_error',
        isApiErrorMessage: true,
        message: { content: [{ text: 'API Error: 500', type: 'text' }] },
        type: 'assistant',
      }),
    ).toEqual([]);
  });

  it('reports a login session as apiKeySource none, and null when unreported', () => {
    expect(
      mapClaudeEvent({
        apiKeySource: 'none',
        session_id: 's',
        subtype: 'init',
        type: 'system',
      })[0]?.metadata,
    ).toEqual({ apiKeySource: 'none', sessionId: 's' });

    expect(
      mapClaudeEvent({ session_id: 's', subtype: 'init', type: 'system' })[0]
        ?.metadata,
    ).toEqual({ apiKeySource: null, sessionId: 's' });
  });
});
