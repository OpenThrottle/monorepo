// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/resources.attachments.$id';

vi.mock('@openthrottle/react-router-graphql', () => ({
  getApiBaseUrl: () => 'http://api.internal',
  getRequestAuthToken: (request: Request) => {
    return request.headers.get('cookie')?.includes('token') ? 'secret' : null;
  },
}));

const { loader } = await import('../resources.attachments.$id');

const mockFetch = vi.fn();

const buildArgs = (cookie = 'token=1'): Route.LoaderArgs => {
  const request = new Request('http://localhost/resources/attachments/att-1', {
    headers: { cookie },
  });
  return {
    context: createTestRouterContext(),
    params: { id: 'att-1' },
    pattern: '/resources/attachments/:id',
    request,
    url: new URL(request.url),
  };
};

describe('routes/resources.attachments.$id loader', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('forwards the bearer token and passes the image headers through', async () => {
    mockFetch.mockResolvedValue(
      new Response('bytes', {
        headers: {
          'Cache-Control': 'private, max-age=3600',
          'Content-Type': 'image/png',
          'Set-Cookie': 'leak=1',
          'X-Content-Type-Options': 'nosniff',
        },
        status: 200,
      }),
    );

    const response = await loader(buildArgs());

    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.internal/attachments/att-1',
      {
        headers: { Authorization: 'Bearer secret' },
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe('private, max-age=3600');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await response.text()).toBe('bytes');
  });

  test('passes a 404 through with no body', async () => {
    mockFetch.mockResolvedValue(new Response('{"x":1}', { status: 404 }));

    const response = await loader(buildArgs());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });

  test('answers 401 without an auth cookie', async () => {
    const response = await loader(buildArgs(''));

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('maps a network failure to 502', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    const response = await loader(buildArgs());

    expect(response.status).toBe(502);
  });
});
