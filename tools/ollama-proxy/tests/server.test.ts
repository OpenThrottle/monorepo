/**
 * @description Unit/integration tests for the Ollama proxy server.
 *
 * Covers the pure parser/validation helpers (`isRecord`,
 * `parseOllamaTagsResponse`) and the request router (`requestHandler`) driven
 * through a real local HTTP server. Upstream `fetch` is replaced with a stub so
 * tests never reach a live Ollama; status/header passthrough and the streaming
 * relay are exercised against a real upstream `http` server.
 */

import * as http from 'node:http';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  isRecord,
  OLLAMA_BASE_URL,
  parseOllamaTagsResponse,
  requestHandler,
  TARGET_MODEL,
} from '../src/server.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FetchFn = typeof globalThis.fetch;

// The genuine fetch captured before any stubbing. Used by the *test client* to
// reach the proxy. The proxy's own outbound (upstream) fetch reads the (stubbed)
// `globalThis.fetch` at call time, so stubbing the global never short-circuits
// the client request itself.
const realFetch: FetchFn = globalThis.fetch.bind(globalThis);

/** Send a request to the proxy using the real (unstubbed) fetch. */
function request(url: string, init?: RequestInit): Promise<Response> {
  return realFetch(url, init);
}

/** Install a typed stub for the global fetch without a type assertion. */
function installFetch(fn: FetchFn): void {
  globalThis.fetch = fn;
}

/** Resolve a server's `http://127.0.0.1:<port>` base URL without a cast. */
function baseUrlFor(server: http.Server): string {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server is not listening on a TCP port');
  }

  return `http://127.0.0.1:${address.port}`;
}

function listen(server: http.Server): Promise<void> {
  return new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

/** Build a JSON Response stub for an upstream fetch. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

/** Read the proxy response body as a record without using a type assertion. */
async function readJsonRecord(res: Response): Promise<Record<string, unknown>> {
  const value: unknown = await res.json();
  if (!isRecord(value)) {
    throw new Error('Expected a JSON object response');
  }

  return value;
}

/** Read `data` from a `/v1/models` response as an array of records. */
function readDataArray(
  body: Record<string, unknown>,
): Record<string, unknown>[] {
  const data = body['data'];
  if (!Array.isArray(data)) {
    throw new Error('Expected `data` to be an array');
  }

  return data.filter(isRecord);
}

// ---------------------------------------------------------------------------
// Test harness: a real proxy server wrapping the exported requestHandler.
// ---------------------------------------------------------------------------

let proxy: http.Server;
let proxyBase: string;

beforeAll(async () => {
  proxy = http.createServer((req, res) => {
    void requestHandler(req, res);
  });

  await listen(proxy);
  proxyBase = baseUrlFor(proxy);
});

afterAll(async () => {
  await close(proxy);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// isRecord
// ---------------------------------------------------------------------------

describe('isRecord', () => {
  it('accepts plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('rejects null, arrays and primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord('x')).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseOllamaTagsResponse
// ---------------------------------------------------------------------------

describe('parseOllamaTagsResponse', () => {
  it('returns an empty object when models is absent', () => {
    expect(parseOllamaTagsResponse({})).toEqual({});
  });

  it('parses a valid models array, keeping only the name', () => {
    const result = parseOllamaTagsResponse({
      models: [{ name: 'a' }, { name: 'b', size: 123 }],
    });

    expect(result).toEqual({ models: [{ name: 'a' }, { name: 'b' }] });
  });

  it('returns null for non-record input', () => {
    expect(parseOllamaTagsResponse(null)).toBeNull();
    expect(parseOllamaTagsResponse([])).toBeNull();
    expect(parseOllamaTagsResponse('nope')).toBeNull();
  });

  it('returns null when models is present but not an array', () => {
    expect(parseOllamaTagsResponse({ models: 'oops' })).toBeNull();
  });

  it('returns null when a model entry is not a record', () => {
    expect(parseOllamaTagsResponse({ models: ['x'] })).toBeNull();
  });

  it('returns null when a model name is missing or not a string', () => {
    expect(parseOllamaTagsResponse({ models: [{ size: 1 }] })).toBeNull();
    expect(parseOllamaTagsResponse({ models: [{ name: 5 }] })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// requestHandler — /v1/chat/completions
// ---------------------------------------------------------------------------

describe('POST /v1/chat/completions', () => {
  it('returns 400 on invalid JSON body', async () => {
    const res = await request(`${proxyBase}/v1/chat/completions`, {
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: { message: 'Invalid JSON body' } });
  });

  it('returns 400 when the JSON body is not an object', async () => {
    const res = await request(`${proxyBase}/v1/chat/completions`, {
      body: '"a string"',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(400);
  });

  it('rewrites the request model to TARGET_MODEL before forwarding', async () => {
    const fetchSpy = vi.fn<FetchFn>(async () => jsonResponse({ ok: true }));
    installFetch(fetchSpy);

    await request(`${proxyBase}/v1/chat/completions`, {
      body: JSON.stringify({
        messages: [{ content: 'hi', role: 'user' }],
        model: 'gpt-4o',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${OLLAMA_BASE_URL}/v1/chat/completions`);
    const forwardedValue: unknown = JSON.parse(String(init?.body));
    if (!isRecord(forwardedValue)) {
      throw new Error('Expected the forwarded body to be an object');
    }
    expect(forwardedValue['model']).toBe(TARGET_MODEL);
    expect(forwardedValue['messages']).toEqual([
      { content: 'hi', role: 'user' },
    ]);
  });

  it('returns 502 (without leaking the error) when the upstream fetch throws', async () => {
    installFetch(
      vi.fn<FetchFn>(async () => {
        throw new Error('connect ECONNREFUSED 10.0.0.1:443');
      }),
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(`${proxyBase}/v1/chat/completions`, {
      body: JSON.stringify({ messages: [], model: 'gpt-4o' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toEqual({ error: { message: 'Upstream request failed' } });
    expect(JSON.stringify(json)).not.toContain('ECONNREFUSED');
    expect(errorSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requestHandler — /v1/models
// ---------------------------------------------------------------------------

describe('GET /v1/models', () => {
  it('maps upstream tags to OpenAI model objects', async () => {
    installFetch(
      vi.fn<FetchFn>(async () =>
        jsonResponse({ models: [{ name: 'foo' }, { name: 'bar' }] }),
      ),
    );

    const res = await request(`${proxyBase}/v1/models`);
    expect(res.status).toBe(200);

    const json = await readJsonRecord(res);
    expect(json['object']).toBe('list');
    const data = readDataArray(json);
    expect(data.map((m) => m['id'])).toEqual(['foo', 'bar']);
    expect(data[0]['object']).toBe('model');
  });

  it('falls back to TARGET_MODEL when upstream lists no models', async () => {
    installFetch(vi.fn<FetchFn>(async () => jsonResponse({ models: [] })));

    const res = await request(`${proxyBase}/v1/models`);
    const json = await readJsonRecord(res);
    const data = readDataArray(json);

    expect(data).toHaveLength(1);
    expect(data[0]['id']).toBe(TARGET_MODEL);
  });

  it('returns 502 when the upstream payload is malformed', async () => {
    installFetch(vi.fn<FetchFn>(async () => jsonResponse({ models: 'nope' })));

    const res = await request(`${proxyBase}/v1/models`);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toEqual({ error: { message: 'Invalid upstream response' } });
  });
});

// ---------------------------------------------------------------------------
// requestHandler — unknown routes
// ---------------------------------------------------------------------------

describe('routing', () => {
  it('returns 404 for unknown paths', async () => {
    const res = await request(`${proxyBase}/nope`);
    expect(res.status).toBe(404);
    const json = await readJsonRecord(res);
    const error = json['error'];
    if (!isRecord(error)) {
      throw new Error('Expected an error object');
    }
    expect(String(error['message'])).toContain('Not found');
  });
});

// ---------------------------------------------------------------------------
// Status / header passthrough + streaming relay against a real upstream server.
// ---------------------------------------------------------------------------

describe('upstream passthrough (real http upstream)', () => {
  let upstream: http.Server;
  let upstreamBase: string;

  /** Rewrite the proxy's outbound OLLAMA_BASE_URL to the real test upstream. */
  function routeToUpstream(): void {
    const fn: FetchFn = (input, init) => {
      const raw = input instanceof Request ? input.url : String(input);
      const target = raw.replace(OLLAMA_BASE_URL, upstreamBase);

      return realFetch(target, init);
    };

    installFetch(fn);
  }

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      if (req.url === '/v1/chat/completions') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'X-Upstream-Marker': 'relayed',
        });
        res.write('data: chunk-1\n\n');
        res.write('data: chunk-2\n\n');
        res.end('data: [DONE]\n\n');

        return;
      }

      if (req.url === '/api/tags') {
        // Non-2xx is passed through verbatim by handleModels.
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'upstream down' }));

        return;
      }

      res.writeHead(404);
      res.end();
    });

    await listen(upstream);
    upstreamBase = baseUrlFor(upstream);
  });

  afterAll(async () => {
    await close(upstream);
  });

  it('relays the upstream stream body and passes through the content-type', async () => {
    routeToUpstream();

    const res = await request(`${proxyBase}/v1/chat/completions`, {
      body: JSON.stringify({ messages: [], model: 'gpt-4o' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    const text = await res.text();
    expect(text).toContain('data: chunk-1');
    expect(text).toContain('data: chunk-2');
    expect(text).toContain('data: [DONE]');
  });

  it('passes through a non-2xx upstream status on /v1/models', async () => {
    routeToUpstream();

    const res = await request(`${proxyBase}/v1/models`);
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).toContain('upstream down');
  });
});
