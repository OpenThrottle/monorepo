/**
 * @description OpenAI-compatible proxy that rewrites the request model and forwards to Ollama.
 * Used so Cursor (which validates model names) can send requests to a whitelisted name
 * (e.g. gpt-4o) while the proxy forwards to the actual local model (e.g. qwen3-coder-next).
 */

import * as http from 'node:http';

const PORT = Number(process.env.OLLAMA_PROXY_PORT ?? '11435');
const OLLAMA_BASE_URL = (
  process.env.OLLAMA_BASE_URL ?? 'https://ollama.local'
).replace(/\/$/, '');
const TARGET_MODEL =
  process.env.OLLAMA_PROXY_TARGET_MODEL ?? 'qwen3-coder-next';

interface ChatCompletionsBody {
  model?: string;
  messages?: unknown[];
  stream?: boolean;
  [key: string]: unknown;
}

function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => chunks.push(chunk));
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

async function handleChatCompletions(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: string,
): Promise<void> {
  let parsed: ChatCompletionsBody;

  try {
    parsed = JSON.parse(body) as ChatCompletionsBody;
  } catch {
    writeJson(res, 400, { error: { message: 'Invalid JSON body' } });
    return;
  }

  const rewritten = { ...parsed, model: TARGET_MODEL };
  const url = `${OLLAMA_BASE_URL}/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const auth = req.headers.authorization;
  if (auth) headers['Authorization'] = auth;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      body: JSON.stringify(rewritten),
      headers,
      method: 'POST',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    writeJson(res, 502, {
      error: { message: `Upstream request failed: ${message}` },
    });

    return;
  }

  res.writeHead(upstream.status, {
    'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
  });

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  try {
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();

      if (done) break;

      res.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  res.end();
}

async function handleModels(res: http.ServerResponse): Promise<void> {
  const url = `${OLLAMA_BASE_URL}/api/tags`;
  let upstream: Response;

  try {
    upstream = await fetch(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeJson(res, 502, {
      error: { message: `Upstream request failed: ${message}` },
    });
    return;
  }

  if (!upstream.ok) {
    res.writeHead(upstream.status);

    if (upstream.body) {
      const reader = upstream.body.getReader();

      const pump = (): Promise<void> =>
        reader.read().then(({ done, value }) => {
          if (done) {
            res.end();
            return;
          }
          res.write(Buffer.from(value));
          return pump();
        });

      await pump();
    } else {
      res.end();
    }

    return;
  }

  let tags: { models?: { name: string }[] };
  try {
    tags = (await upstream.json()) as { models?: { name: string }[] };
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

const requestHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
    });

    res.end();

    return;
  }

  const path = req.url?.split('?')[0] ?? '';
  if (path === '/v1/models' && req.method === 'GET') {
    await handleModels(res);

    return;
  }

  if (path === '/v1/chat/completions' && req.method === 'POST') {
    const body = await parseBody(req);
    await handleChatCompletions(req, res, body);

    return;
  }

  writeJson(res, 404, {
    error: { message: `Not found: ${req.method} ${path}` },
  });
};

const server = http.createServer(requestHandler);

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `Ollama proxy listening on http://127.0.0.1:${PORT}; upstream=${OLLAMA_BASE_URL}, target model=${TARGET_MODEL}`,
  );
  console.log(
    `Use in Cursor: Override OpenAI Base URL = http://127.0.0.1:${PORT}/v1`,
  );
});
