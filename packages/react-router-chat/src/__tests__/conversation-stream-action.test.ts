import { GraphqlResponseError } from '@openthrottle/react-router-graphql';
import { parse } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildStartConversationStreamInput,
  createConversationStreamAction,
  parseFileMentionsField,
} from '../conversation-stream-action';

const { executeGraphqlWithAuth } = vi.hoisted(() => {
  return { executeGraphqlWithAuth: vi.fn() };
});

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();

  return { ...actual, executeGraphqlWithAuth };
});

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
      attachmentIds: null,
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
      repositoryIds: null,
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

  it('decodes the attachmentIds JSON field', () => {
    expect(
      buildStartConversationStreamInput(
        formOf({ attachmentIds: JSON.stringify(['att-1', 'att-2']) }),
      ).attachmentIds,
    ).toEqual(['att-1', 'att-2']);
  });

  it('nulls an absent attachmentIds', () => {
    expect(
      buildStartConversationStreamInput(formOf({})).attachmentIds,
    ).toBeNull();
  });

  it('decodes repositoryIds primary-first, preserving order', () => {
    expect(
      buildStartConversationStreamInput(
        formOf({ repositoryIds: JSON.stringify(['repo-b', 'repo-a']) }),
      ).repositoryIds,
    ).toEqual(['repo-b', 'repo-a']);
  });

  it('nulls a malformed repositoryIds rather than throwing', () => {
    expect(
      buildStartConversationStreamInput(formOf({ repositoryIds: '{not json' }))
        .repositoryIds,
    ).toBeNull();
  });

  it('nulls an empty repositoryIds array', () => {
    expect(
      buildStartConversationStreamInput(
        formOf({ repositoryIds: JSON.stringify([]) }),
      ).repositoryIds,
    ).toBeNull();
  });

  it('still carries a legacy single repositoryId for an in-flight client', () => {
    const input = buildStartConversationStreamInput(
      formOf({ repositoryId: 'repo-legacy' }),
    );

    expect(input.repositoryId).toBe('repo-legacy');
    expect(input.repositoryIds).toBeNull();
  });
});

describe('createConversationStreamAction start errors', () => {
  const run = async (): Promise<unknown> => {
    const action = createConversationStreamAction({
      cancelDocument: parse('query Noop { __typename }'),
      respondPermissionDocument: parse('query Noop { __typename }'),
      startDocument: parse('query Noop { __typename }'),
    });
    const body = new FormData();
    body.set('message', 'hi');

    return action({
      request: new Request('http://localhost/x', { body, method: 'POST' }),
    });
  };

  beforeEach(() => {
    executeGraphqlWithAuth.mockReset();
  });

  it.each([
    ['ATTACHMENTS_UNSUPPORTED', /does not accept images/],
    ['TOO_MANY_ATTACHMENTS', /Too many images/],
    ['ATTACHMENT_NOT_FOUND', /no longer available/],
  ])('maps the %s reason to plain-language copy', async (reason, pattern) => {
    executeGraphqlWithAuth.mockRejectedValue(
      new GraphqlResponseError('GraphQL errors: raw', {
        code: 'BAD_USER_INPUT',
        reason,
      }),
    );

    expect(await run()).toMatchObject({
      errorMessage: expect.stringMatching(pattern),
    });
  });

  it('keeps the raw message for any other failure', async () => {
    executeGraphqlWithAuth.mockRejectedValue(new Error('boom'));

    expect(await run()).toMatchObject({ errorMessage: 'boom' });
  });
});
