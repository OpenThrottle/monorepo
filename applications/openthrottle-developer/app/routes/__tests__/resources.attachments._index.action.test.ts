// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/resources.attachments._index';

vi.mock('@openthrottle/react-router-graphql', () => ({
  getApiBaseUrl: () => 'http://api.internal',
  getRequestAuthToken: (request: Request) => {
    return request.headers.get('cookie')?.includes('token') ? 'secret' : null;
  },
}));

const { action } = await import('../resources.attachments._index');

const mockFetch = vi.fn();

const buildArgs = (
  options: { file?: File; headers?: Record<string, string> } = {},
): Route.ActionArgs => {
  const body = new FormData();
  if (options.file !== undefined) {
    body.append('file', options.file);
  }
  const request = new Request('http://localhost/resources/attachments', {
    body,
    headers: { cookie: 'token=1', ...options.headers },
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/resources/attachments',
    request,
    url: new URL(request.url),
  };
};

const png = (): File => {
  return new File(['x'], 'shot.png', { type: 'image/png' });
};

describe('routes/resources.attachments._index action', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('rejects a cross-origin upload with 403 and never calls the API', async () => {
    const response = await action(
      buildArgs({ file: png(), headers: { origin: 'http://evil.example' } }),
    );

    expect(response.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('accepts a same-origin upload and forwards the bearer token', async () => {
    mockFetch.mockResolvedValue(
      Response.json({ id: 'att-1' }, { status: 201 }),
    );

    const response = await action(
      buildArgs({ file: png(), headers: { origin: 'http://localhost' } }),
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.internal/attachments',
      expect.objectContaining({
        headers: { Authorization: 'Bearer secret' },
        method: 'POST',
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'att-1' });
  });

  test.each([413, 415])('passes an upstream %i through', async (status) => {
    mockFetch.mockResolvedValue(Response.json({ message: 'no' }, { status }));

    const response = await action(buildArgs({ file: png() }));

    expect(response.status).toBe(status);
  });

  test('answers 413 when Content-Length exceeds the limit, before reading the body', async () => {
    const response = await action(
      buildArgs({
        file: png(),
        headers: { 'content-length': String(10 * 1024 * 1024 + 64 * 1024 + 1) },
      }),
    );

    expect(response.status).toBe(413);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('lets a request through when Content-Length is within the limit', async () => {
    mockFetch.mockResolvedValue(
      Response.json({ id: 'att-1' }, { status: 201 }),
    );

    const response = await action(
      buildArgs({ file: png(), headers: { 'content-length': '1024' } }),
    );

    expect(response.status).toBe(201);
  });

  test('answers 400 when there is no file', async () => {
    const response = await action(buildArgs());

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('answers 401 without an auth cookie', async () => {
    const response = await action(
      buildArgs({ file: png(), headers: { cookie: '' } }),
    );

    expect(response.status).toBe(401);
  });

  test('maps a network failure to 502', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    const response = await action(buildArgs({ file: png() }));

    expect(response.status).toBe(502);
  });
});
