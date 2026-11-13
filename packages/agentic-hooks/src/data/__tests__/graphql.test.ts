/**
 * Failure classification for the shared mutation POST: permanent rejections
 * are dead-lettered by the drain, everything else is retried.
 */
import { describe, expect, it } from 'vitest';

import type { HookFetch } from '../../index.ts';
import {
  isPermanentHttpStatus,
  isSchemaSkewMessage,
  omitField,
  postGraphqlMutation,
} from '../../index.ts';

const respond = (status: number, payload: unknown): HookFetch => {
  return async () => ({ json: async () => payload, ok: status < 400, status });
};

const post = (fetchImpl: HookFetch) => {
  return postGraphqlMutation({
    authToken: 'tok',
    fetchImpl,
    field: 'recordThing',
    graphqlUrl: 'http://example.test/graphql',
    query: 'mutation { recordThing { id } }',
    timeoutMs: 200,
    variables: {},
  });
};

const graphqlError = (extensions: Record<string, unknown>) => {
  return {
    data: null,
    errors: [{ extensions, message: 'nope' }],
  };
};

describe('postGraphqlMutation', () => {
  it('returns the id on success', async () => {
    await expect(
      post(respond(200, { data: { recordThing: { id: 'x1' } } })),
    ).resolves.toEqual({ id: 'x1', ok: true });
  });

  describe.each([
    ['BAD_REQUEST', { code: 'BAD_REQUEST' }],
    ['GRAPHQL_VALIDATION_FAILED', { code: 'GRAPHQL_VALIDATION_FAILED' }],
    [
      'a 400 originalError',
      { code: 'INTERNAL_SERVER_ERROR', originalError: { statusCode: 400 } },
    ],
  ])('when the server rejects the payload (%s)', (_label, extensions) => {
    it('is permanent', async () => {
      await expect(
        post(respond(200, graphqlError(extensions))),
      ).resolves.toEqual({ ok: false, permanent: true, reason: 'nope' });
    });
  });

  describe.each([
    [
      'UNAUTHENTICATED',
      { code: 'UNAUTHENTICATED', originalError: { statusCode: 401 } },
    ],
    ['INTERNAL_SERVER_ERROR', { code: 'INTERNAL_SERVER_ERROR' }],
  ])('when the environment is at fault (%s)', (_label, extensions) => {
    it('is transient', async () => {
      await expect(
        post(respond(200, graphqlError(extensions))),
      ).resolves.toMatchObject({ ok: false, permanent: false });
    });
  });

  describe('when the server is older than the hooks (schema skew)', () => {
    const skew = `Variable "$input" got invalid value { account: {} } at "input.rows[0]"; Field "account" is not defined by type "RecordTokenUsageRowInput".`;

    it('is transient even with a permanent code and a 400', async () => {
      await expect(
        post(
          respond(400, {
            errors: [
              {
                extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
                message: skew,
              },
            ],
          }),
        ),
      ).resolves.toEqual({ ok: false, permanent: false, reason: skew });
    });

    it('stays permanent when a non-skew rejection rides along', async () => {
      await expect(
        post(
          respond(200, {
            errors: [
              { extensions: { code: 'BAD_USER_INPUT' }, message: skew },
              { extensions: { code: 'BAD_USER_INPUT' }, message: 'nope' },
            ],
          }),
        ),
      ).resolves.toMatchObject({ ok: false, permanent: true });
    });
  });

  describe('when the network fails', () => {
    it('is transient', async () => {
      const fetchImpl: HookFetch = async () => {
        throw new Error('fetch failed');
      };
      await expect(post(fetchImpl)).resolves.toEqual({
        ok: false,
        permanent: false,
        reason: 'fetch failed',
      });
    });
  });

  describe('when no endpoint resolves', () => {
    it('is transient', async () => {
      await expect(
        postGraphqlMutation({
          authToken: '',
          fetchImpl: respond(200, {}),
          field: 'recordThing',
          graphqlUrl: null,
          query: '',
          timeoutMs: 200,
          variables: {},
        }),
      ).resolves.toMatchObject({ permanent: false });
    });
  });

  describe('when the response is a bare HTTP error', () => {
    it('treats 404 as permanent and 503 as transient', async () => {
      await expect(post(respond(404, {}))).resolves.toMatchObject({
        permanent: true,
      });
      await expect(post(respond(503, {}))).resolves.toMatchObject({
        permanent: false,
      });
    });
  });
});

describe('isSchemaSkewMessage', () => {
  it.each([
    'Field "account" is not defined by type "RecordTokenUsageRowInput".',
    'Cannot query field "recordThing" on type "Mutation".',
    'Unknown argument "scope" on field "Mutation.recordThing".',
    'Unknown type "RecordThingInput".',
    'Value "NEW" does not exist in "Status" enum.',
  ])('recognizes %s', (message) => {
    expect(isSchemaSkewMessage(message)).toBe(true);
  });

  it.each([
    'Expected value of type "Float!", found "abc".',
    'model must not be blank',
    'plan run or task not found',
  ])('does not treat %s as skew', (message) => {
    expect(isSchemaSkewMessage(message)).toBe(false);
  });
});

describe('isPermanentHttpStatus', () => {
  it.each([400, 404, 409, 422])('%i is permanent', (status) => {
    expect(isPermanentHttpStatus(status)).toBe(true);
  });

  it.each([401, 403, 408, 429, 500, 503])('%i is not', (status) => {
    expect(isPermanentHttpStatus(status)).toBe(false);
  });
});

describe('legacyVariables', () => {
  const unknownField = {
    data: null,
    errors: [
      {
        extensions: { code: 'BAD_USER_INPUT' },
        message: `Variable "$input" got invalid value; Field "repoIdentity" is not defined by type "RecordThingInput".`,
      },
    ],
  };

  /** A fetch that answers each call in turn and records what it was sent. */
  const sequence = (
    payloads: readonly unknown[],
  ): { fetchImpl: HookFetch; sent: unknown[] } => {
    const sent: unknown[] = [];
    const fetchImpl: HookFetch = async (_url, init) => {
      sent.push(JSON.parse(String(init?.body)).variables);
      const payload = payloads[sent.length - 1];
      return { json: async () => payload, ok: true, status: 200 };
    };
    return { fetchImpl, sent };
  };

  const postWithLegacy = (fetchImpl: HookFetch) => {
    const input = { name: 'x', repoIdentity: 'https://github.com/org/repo' };
    return postGraphqlMutation({
      authToken: 'tok',
      fetchImpl,
      field: 'recordThing',
      graphqlUrl: 'http://example.test/graphql',
      legacyVariables: { input: omitField(input, 'repoIdentity') },
      query: 'mutation { recordThing { id } }',
      timeoutMs: 200,
      variables: { input },
    });
  };

  describe('when an older server does not define a sent field (transient skew)', () => {
    it('re-sends once without it and reports that result', async () => {
      const { fetchImpl, sent } = sequence([
        unknownField,
        { data: { recordThing: { id: 'x1' } } },
      ]);

      await expect(postWithLegacy(fetchImpl)).resolves.toEqual({
        id: 'x1',
        ok: true,
      });
      expect(sent).toEqual([
        { input: { name: 'x', repoIdentity: 'https://github.com/org/repo' } },
        { input: { name: 'x' } },
      ]);
    });
  });

  describe('when the rejection is about anything else', () => {
    it('does not retry', async () => {
      const { fetchImpl, sent } = sequence([
        graphqlError({ code: 'BAD_REQUEST' }),
      ]);

      await expect(postWithLegacy(fetchImpl)).resolves.toMatchObject({
        ok: false,
        permanent: true,
      });
      expect(sent).toHaveLength(1);
    });
  });
});
