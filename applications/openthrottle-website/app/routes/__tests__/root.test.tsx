import { RouterContextProvider } from 'react-router';
import { describe, expect, test } from 'vitest';
import { loader } from '~/root';

// This app has middleware enabled, so `Route.LoaderArgs['context']` is a
// `RouterContextProvider` (not a bare object). A fresh instance satisfies the
// type; the root loader never reads from it.
const context = new RouterContextProvider();

describe('root.tsx', () => {
  describe('loader', () => {
    test('returns the pinned repo slug', async () => {
      const request = new Request('https://openthrottle.ai/');
      const data = await loader({
        context,
        params: {},
        pattern: '/',
        request,
        url: new URL(request.url),
      });

      expect(data.repo).toBe('openthrottle/openthrottle');
    });

    test('injects a serializable env object for the client script', async () => {
      const request = new Request('https://openthrottle.ai/');
      const data = await loader({
        context,
        params: {},
        pattern: '/',
        request,
        url: new URL(request.url),
      });

      // `Layout` serializes this into `window.env = ...`, so it must be a
      // plain, JSON-serializable object.
      expect(data.env).toBeTypeOf('object');
      expect(data.env).not.toBeNull();
      expect(() => JSON.stringify(data.env)).not.toThrow();
    });

    test('reads the cookie header without throwing when it is present', async () => {
      const request = new Request('https://openthrottle.ai/', {
        headers: { cookie: 'session=abc' },
      });
      const data = await loader({
        context,
        params: {},
        pattern: '/',
        request,
        url: new URL(request.url),
      });

      expect(data.repo).toBe('openthrottle/openthrottle');
    });

    test('does not throw when the request carries no cookie header', async () => {
      const request = new Request('https://openthrottle.ai/');

      await expect(
        loader({
          context,
          params: {},
          pattern: '/',
          request,
          url: new URL(request.url),
        }),
      ).resolves.toBeDefined();
    });
  });
});
