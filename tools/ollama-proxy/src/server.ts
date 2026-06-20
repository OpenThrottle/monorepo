/**
 * @description OpenAI-compatible proxy that rewrites the request model and forwards to Ollama.
 * Used so Cursor (which validates model names) can send requests to a whitelisted name
 * (e.g. gpt-4o) while the proxy forwards to the actual local model (e.g. qwen3-coder-next).
 */

import * as http from 'node:http';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.OLLAMA_PROXY_PORT ?? '11435');
export const OLLAMA_BASE_URL = (
  process.env.OLLAMA_BASE_URL ?? 'https://ollama.local'
).replace(/\/$/, '');
export const TARGET_MODEL =
  process.env.OLLAMA_PROXY_TARGET_MODEL ?? 'qwen3-coder-next';
const TIMEOUT_MS = Number(process.env.OLLAMA_PROXY_TIMEOUT_MS ?? '120000');
const UPSTREAM_TOKEN = process.env.OLLAMA_PROXY_UPSTREAM_TOKEN ?? '';
const MAX_BODY_BYTES = Number(
  process.env.OLLAMA_PROXY_MAX_BODY_BYTES ?? `${10 * 1024 * 1024}`,
);

// CORS is opt-in. Native clients (Cursor) talk to the proxy directly and do not
// need CORS headers; a wildcard would let any web page in the user's browser
// drive the local model. Set OLLAMA_PROXY_ALLOWED_ORIGINS to a comma-separated
// allowlist to enable browser access; the proxy then echoes only matching origins.
const ALLOWED_ORIGINS = (process.env.OLLAMA_PROXY_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

class BodyTooLargeError extends Error {
  constructor(limitBytes: number) {
    super(`Request body exceeds maximum size of ${limitBytes} bytes`);
    this.name = 'BodyTooLargeError';
  }
}

function isBodyTooLargeError(error: unknown): boolean {
  return error instanceof BodyTooLargeError;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

interface ChatCompletionsBody {
  [key: string]: unknown;
  messages?: unknown[];
  model?: string;
  stream?: boolean;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface OllamaModelTag {
  readonly name: string;
}

interface OllamaTagsResponse {
  readonly models?: readonly OllamaModelTag[];
}

export function parseOllamaTagsResponse(
  value: unknown,
): OllamaTagsResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawModels = value['models'];
  if (rawModels === undefined) {
    return {};
  }

  if (!Array.isArray(rawModels)) {
    return null;
  }

  const models: OllamaModelTag[] = [];
  for (const item of rawModels) {
    if (!isRecord(item)) {
      return null;
    }

    const name = item['name'];
    if (typeof name !== 'string') {
      return null;
    }

    models.push({ name });
  }

  return { models };
}

function parseBody(
  req: http.IncomingMessage,
  maxBytes: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(req.headers['content-length']);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      reject(new BodyTooLargeError(maxBytes));
      return;
    }

    const chunks: Buffer[] = [];
    let total = 0;

    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new BodyTooLargeError(maxBytes));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function writeJson(
  res: http.ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Resolve the CORS origin header value for a request, or null when CORS is disabled. */
function resolveCorsOrigin(req: http.IncomingMessage): string | null {
  const origin = req.headers['origin'];
  if (typeof origin !== 'string' || !ALLOWED_ORIGINS.includes(origin)) {
    return null;
  }

  return origin;
}

/** Wait for a backpressured response to drain before resuming writes. */
function waitForDrain(res: http.ServerResponse): Promise<void> {
  return new Promise<void>((resolve) => {
    res.once('drain', resolve);
  });
}

/**
 * Pipe an upstream fetch body to the client response, honoring `res.write`
 * backpressure and cancelling the upstream reader when the client disconnects.
 */
async function pipeStreamToResponse(
  body: ReadableStream<Uint8Array>,
  res: http.ServerResponse,
): Promise<void> {
  const reader = body.getReader();
  let clientGone = res.writableEnded || res.destroyed;
  const onClose = (): void => {
    clientGone = true;
    void reader.cancel().catch(() => undefined);
  };

  res.once('close', onClose);

  try {
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();

      if (done) break;
      if (clientGone) break;

      const ok = res.write(Buffer.from(value));
      if (!ok) {
        // eslint-disable-next-line no-await-in-loop
        await waitForDrain(res);
      }
    }
  } finally {
    res.off('close', onClose);
    reader.releaseLock();
  }

  if (!clientGone && !res.writableEnded) {
    res.end();
  }
}

/**
 * Build a fetch signal that aborts on either the upstream timeout or the client
 * disconnecting, and wire the disconnect listener on the request/response.
 */
function createUpstreamSignal(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): AbortSignal {
  const controller = new AbortController();
  const onClose = (): void => controller.abort();

  req.once('close', onClose);
  res.once('close', onClose);

  return AbortSignal.any([controller.signal, AbortSignal.timeout(TIMEOUT_MS)]);
}

/** Map an upstream fetch error onto a client response without leaking internals. */
function writeUpstreamFetchError(
  res: http.ServerResponse,
  error: unknown,
): void {
  if (res.headersSent || res.writableEnded) {
    // Client already received headers (or disconnected); nothing to send.
    return;
  }

  if (isAbortError(error)) {
    writeJson(res, 504, {
      error: { message: `Upstream request timed out after ${TIMEOUT_MS}ms` },
    });

    return;
  }

  // Log the underlying error server-side for debugging, but do NOT echo the raw
  // message to the client — it can leak internal hostnames/paths.
  console.error('Upstream request failed:', error);

  writeJson(res, 502, {
    error: { message: 'Upstream request failed' },
  });
}

async function handleChatCompletions(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: string,
): Promise<void> {
  let parsed: ChatCompletionsBody;

  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) {
      writeJson(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }
    parsed = value;
  } catch {
    writeJson(res, 400, { error: { message: 'Invalid JSON body' } });
    return;
  }

  const rewritten = { ...parsed, model: TARGET_MODEL };
  const url = `${OLLAMA_BASE_URL}/v1/chat/completions`;

  // Do NOT forward the inbound client Authorization header to the upstream:
  // the proxy ignores the client API key (see README), and forwarding it would
  // leak whatever the client sends to a potentially remote OLLAMA_BASE_URL.
  // Only attach a dedicated upstream token when one is explicitly configured.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (UPSTREAM_TOKEN) headers['Authorization'] = `Bearer ${UPSTREAM_TOKEN}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      body: JSON.stringify(rewritten),
      headers,
      method: 'POST',
      signal: createUpstreamSignal(req, res),
    });
  } catch (error) {
    writeUpstreamFetchError(res, error);

    return;
  }

  res.writeHead(upstream.status, {
    'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
  });

  if (!upstream.body) {
    res.end();
    return;
  }

  await pipeStreamToResponse(upstream.body, res);
}

async function handleModels(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = `${OLLAMA_BASE_URL}/api/tags`;
  let upstream: Response;

  try {
    upstream = await fetch(url, { signal: createUpstreamSignal(req, res) });
  } catch (error) {
    writeUpstreamFetchError(res, error);

    return;
  }

  if (!upstream.ok) {
    res.writeHead(upstream.status);

    if (upstream.body) {
      await pipeStreamToResponse(upstream.body, res);
    } else {
      res.end();
    }

    return;
  }

  let tags: OllamaTagsResponse;
  try {
    const value: unknown = await upstream.json();
    const parsedTags = parseOllamaTagsResponse(value);
    if (parsedTags === null) {
      writeJson(res, 502, { error: { message: 'Invalid upstream response' } });
      return;
    }
    tags = parsedTags;
  } catch {
    writeJson(res, 502, { error: { message: 'Invalid upstream response' } });
    return;
  }

  const models = (tags.models ?? []).map((m) => ({
    created: Math.floor(Date.now() / 1000),
    id: m.name,
    object: 'model' as const,
  }));

  writeJson(res, 200, {
    data:
      models.length > 0
        ? models
        : [
            {
              created: Math.floor(Date.now() / 1000),
              id: TARGET_MODEL,
              object: 'model' as const,
            },
          ],
    object: 'list',
  });
}

export const requestHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> => {
  const corsOrigin = resolveCorsOrigin(req);

  if (req.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    // Only emit CORS headers for explicitly allowlisted origins
    // (OLLAMA_PROXY_ALLOWED_ORIGINS); native clients do not need them.
    if (corsOrigin) {
      headers['Access-Control-Allow-Origin'] = corsOrigin;
      headers['Vary'] = 'Origin';
    }

    res.writeHead(204, headers);

    res.end();

    return;
  }

  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }

  const path = req.url?.split('?')[0] ?? '';
  if (path === '/v1/models' && req.method === 'GET') {
    await handleModels(req, res);

    return;
  }

  if (path === '/v1/chat/completions' && req.method === 'POST') {
    let body: string;
    try {
      body = await parseBody(req, MAX_BODY_BYTES);
    } catch (error) {
      if (isBodyTooLargeError(error)) {
        if (!res.headersSent) {
          writeJson(res, 413, {
            error: {
              message: `Request body exceeds maximum size of ${MAX_BODY_BYTES} bytes`,
            },
          });
        }
        req.destroy();

        return;
      }

      throw error;
    }
    await handleChatCompletions(req, res, body);

    return;
  }

  writeJson(res, 404, {
    error: { message: `Not found: ${req.method} ${path}` },
  });
};

/** Create and start the proxy HTTP server. Separated so tests can import the
 *  request handler/helpers without binding a port. */
export function startServer(): http.Server {
  const server = http.createServer(requestHandler);

  server.listen(PORT, '127.0.0.1', () => {
    console.log(
      `Ollama proxy listening on http://127.0.0.1:${PORT}; upstream=${OLLAMA_BASE_URL}, target model=${TARGET_MODEL}`,
    );
    console.log(
      `Use in Cursor: Override OpenAI Base URL = http://127.0.0.1:${PORT}/v1`,
    );
  });

  return server;
}

// Only start listening when run directly (e.g. `node dist/server.js`), not when
// imported by a test module.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}
