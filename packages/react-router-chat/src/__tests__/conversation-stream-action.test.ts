import { describe, expect, it } from 'vitest';
import {
  buildStartConversationStreamInput,
  parseFileMentionsField,
} from '../conversation-stream-action';

describe('parseFileMentionsField', () => {
  it('decodes a JSON array of paths', () => {
    expect(parseFileMentionsField(JSON.stringify(['a.ts', 'b/c.ts']))).toEqual([
      'a.ts',
      'b/c.ts',
    ]);
  });

  it('drops non-string entries', () => {
    expect(
      parseFileMentionsField(JSON.stringify(['a.ts', 1, null, 'b.ts'])),
    ).toEqual(['a.ts', 'b.ts']);
  });

  it('returns null for an empty array', () => {
    expect(parseFileMentionsField(JSON.stringify([]))).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseFileMentionsField(null)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseFileMentionsField('')).toBeNull();
  });

  it('returns null for a non-array JSON value', () => {
    expect(
      parseFileMentionsField(JSON.stringify({ paths: ['a.ts'] })),
    ).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseFileMentionsField('{not json')).toBeNull();
  });
});

describe('buildStartConversationStreamInput', () => {
  const formOf = (entries: Record<string, string>): FormData => {
    const form = new FormData();
    for (const [key, value] of Object.entries(entries)) {
      form.set(key, value);
    }
    return form;
  };

  it('maps present fields and nulls the absent ones (persist defaults to null)', () => {
    const input = buildStartConversationStreamInput(
      formOf({
        backend: 'cursor',
        message: 'hello',
        modelId: 'gpt-5.2',
        repositoryId: 'repo-1',
      }),
    );

    expect(input).toEqual({
      backend: 'cursor',
      baseUrl: null,
      conversationId: null,
      fileMentions: null,
      message: 'hello',
      modelId: 'gpt-5.2',
      permissionMode: null,
      persist: null,
      personaId: null,
      reasoning: null,
      repositoryId: 'repo-1',
      serviceTier: null,
    });
  });

  it('treats persist=false as an opt-in ephemeral turn', () => {
    expect(
      buildStartConversationStreamInput(formOf({ persist: 'false' })).persist,
    ).toBe(false);
    expect(
      buildStartConversationStreamInput(formOf({ persist: 'true' })).persist,
    ).toBeNull();
  });

  it('decodes the fileMentions JSON field', () => {
    expect(
      buildStartConversationStreamInput(
        formOf({ fileMentions: JSON.stringify(['a.ts', 'b.ts']) }),
      ).fileMentions,
    ).toEqual(['a.ts', 'b.ts']);
  });
});
