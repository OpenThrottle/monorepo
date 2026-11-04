/**
 * Failure classification for the shared mutation POST: permanent rejections
 * are dead-lettered by the drain, everything else is retried.
 */
import { describe, expect, it } from 'vitest';

import type { HookFetch } from '../../index.ts';
import { isPermanentHttpStatus, postGraphqlMutation } from '../../index.ts';

const respond =
  (status: number, payload: unknown): HookFetch =>
  async () => ({ json: async () => payload, ok: status < 400, status });

const post = (fetchImpl: HookFetch) =>
  postGraphqlMutation({
    authToken: 'tok',
    fetchImpl,
    field: 'recordThing',
    graphqlUrl: 'http://example.test/graphql',
    query: 'mutation { recordThing { id } }',
    timeoutMs: 200,
    variables: {},
  });

const graphqlError = (extensions: Record<string, unknown>) => ({
  data: null,
  errors: [{ extensions, message: 'nope' }],
});

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

describe('isPermanentHttpStatus', () => {
  it.each([400, 404, 409, 422])('%i is permanent', (status) => {
    expect(isPermanentHttpStatus(status)).toBe(true);
  });

  it.each([401, 403, 408, 429, 500, 503])('%i is not', (status) => {
    expect(isPermanentHttpStatus(status)).toBe(false);
  });
});
