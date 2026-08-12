import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchServerMetrics } from '../fetchServerMetrics';

interface SampleMetrics {
  readonly uptimeSeconds: number;
}

describe('fetchServerMetrics', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('returns the serverMetrics envelope on success', async () => {
    const data = { serverMetrics: { uptimeSeconds: 42 } };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ data }), { status: 200 }),
    );

    const result = await fetchServerMetrics<SampleMetrics>(
      'https://api.example.test/graphql',
      'query { serverMetrics { uptimeSeconds } }',
    );

    expect(result).toEqual(data);
  });

  test('sends a POST with the query and no Authorization header when token is omitted', async () => {
    const data = { serverMetrics: { uptimeSeconds: 1 } };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ data }), { status: 200 }),
    );

    await fetchServerMetrics<SampleMetrics>(
      'https://api.example.test/graphql',
      'query { serverMetrics { uptimeSeconds } }',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.test/graphql',
      expect.objectContaining({
        body: JSON.stringify({
          query: 'query { serverMetrics { uptimeSeconds } }',
          variables: undefined,
        }),
        method: 'POST',
      }),
    );
    const [, init] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBeNull();
  });

  test('includes a Bearer Authorization header when token is provided', async () => {
    const data = { serverMetrics: { uptimeSeconds: 1 } };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ data }), { status: 200 }),
    );

    await fetchServerMetrics<SampleMetrics>(
      'https://api.example.test/graphql',
      'query { serverMetrics { uptimeSeconds } }',
      'secret-token',
    );

    const [, init] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer secret-token');
  });

  test('throws when the response is not ok', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'boom' }] }), {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    await expect(
      fetchServerMetrics<SampleMetrics>(
        'https://api.example.test/graphql',
        'query { serverMetrics { uptimeSeconds } }',
      ),
    ).rejects.toThrow('GraphQL error 500: boom');
  });

  test('throws when the payload contains GraphQL errors despite a 200', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ message: 'field not found' }] }),
        { status: 200 },
      ),
    );

    await expect(
      fetchServerMetrics<SampleMetrics>(
        'https://api.example.test/graphql',
        'query { serverMetrics { uptimeSeconds } }',
      ),
    ).rejects.toThrow('GraphQL errors: field not found');
  });

  test('throws when the response is missing serverMetrics', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );

    await expect(
      fetchServerMetrics<SampleMetrics>(
        'https://api.example.test/graphql',
        'query { serverMetrics { uptimeSeconds } }',
      ),
    ).rejects.toThrow('GraphQL response missing serverMetrics');
  });
});
