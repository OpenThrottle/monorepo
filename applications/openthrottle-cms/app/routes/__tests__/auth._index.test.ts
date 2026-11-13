import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { describe, expect, test } from 'vitest';

const { loader } = await import('../auth._index');

describe('routes/auth._index', () => {
  test('forwards to sign-in, keeping the query string', async () => {
    const request = new Request(
      'http://localhost/auth?redirectTo=%2Ffragments%2Fabc',
    );
    const response = await loader({ context: createTestRouterContext(), params: {}, pattern: '/auth', request, url: new URL(request.url) }); // prettier-ignore

    expect(response.headers.get('Location')).toBe('/auth/sign-in?redirectTo=%2Ffragments%2Fabc'); // prettier-ignore
  });
});
