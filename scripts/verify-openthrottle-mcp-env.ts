/**
 * @description Verifies local prerequisites for OpenThrottle MCP
 * (@openthrottle/openthrottle-mcp): openthrottle-server reachable, embedding
 * config hint, optional auth token smoke, and the streamable-HTTP transport
 * probe. Exit codes match the shell version: hard-fail on unreachable server,
 * rejected token, or missing token (unless OT_MCP_ALLOW_NO_TOKEN=1).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readEnvFile } from './lib/env.ts';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

/** True when a .env map carries a usable embedding provider config. */
export const hasEmbeddingConfig = (env: Record<string, string>): boolean =>
  (env.OPENAI_API_KEY ?? '') !== '' || (env.OLLAMA_BASE_URL ?? '') !== '';

export type AuthSmokeVerdict = 'inconclusive' | 'ok' | 'rejected';

/**
 * Classify the authenticated GraphQL smoke response. The server answers auth
 * failures with HTTP 200 + an "errors" array (data:null), and the error's
 * "path":["listSources"] makes a naive substring check for "listSources"
 * false-pass. Decide on the body: any "errors" ⇒ rejected; otherwise a real
 * "sources" payload ⇒ OK.
 */
export const classifyAuthSmoke = (
  status: number,
  body: string,
): AuthSmokeVerdict => {
  if (body.includes('"errors"')) {
    return 'rejected';
  }

  if (status === 200 && body.includes('"sources"')) {
    return 'ok';
  }

  if (status === 401 || status === 403) {
    return 'rejected';
  }

  return 'inconclusive';
};

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<{ body: string; status: number } | undefined> => {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });

    return { body: await response.text(), status: response.status };
  } catch {
    return undefined;
  }
};

const main = async (): Promise<void> => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const base = (process.env.API_URL_INTERNAL ?? 'http://localhost:6021').replace(/\/$/, ''); // prettier-ignore

  logger.info('OpenThrottle MCP verification — environment check');
  logger.detail(`API_URL_INTERNAL (effective): ${base}`);
  logger.blank();

  const health = await fetchWithTimeout(`${base}/health`, 5000);

  if (health === undefined || health.status >= 400) {
    logger.fail(`openthrottle-server not reachable at ${base}/health`);
    logger.detail('Start the API (e.g. pnpm nx run openthrottle-server:dev) and ensure PORT matches this URL.'); // prettier-ignore
    process.exit(1);
  }

  logger.success(`GET ${base}/health`);

  const rootEnv = readEnvFile(join(root, '.env'));
  const serverEnv = readEnvFile(join(root, 'applications/openthrottle-server/.env')); // prettier-ignore

  if (hasEmbeddingConfig(rootEnv) || hasEmbeddingConfig(serverEnv)) {
    logger.success('embedding provider configured (OPENAI_API_KEY or OLLAMA_BASE_URL in root .env and/or server .env)'); // prettier-ignore
  } else {
    logger.warn('no OPENAI_API_KEY or OLLAMA_BASE_URL in root .env or applications/openthrottle-server/.env'); // prettier-ignore
    logger.detail('MCP starts without a launcher key; semantic_search needs server-side embeddings — see docs/monorepo/Ollama.md'); // prettier-ignore
  }

  const token = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN ?? '';

  if (token !== '') {
    logger.success('OPENTHROTTLE_MCP_AUTH_TOKEN is set in the environment');

    const smoke = await fetchWithTimeout(`${base}/graphql`, 10_000, {
      body: JSON.stringify({ query: 'query { listSources { sources { name } } }' }), // prettier-ignore
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const verdict =
      smoke === undefined
        ? 'inconclusive'
        : classifyAuthSmoke(smoke.status, smoke.body);

    if (verdict === 'rejected') {
      logger.fail('authenticated GraphQL rejected the token — revoked, wrong server, or missing plans:* role'); // prettier-ignore
      logger.detail(`Response: ${smoke?.body.slice(0, 200) ?? '(empty)'}`);
      process.exit(1);
    } else if (verdict === 'ok') {
      logger.success('authenticated GraphQL listSources (with ot_sa token)');
    } else {
      logger.warn(`authenticated GraphQL smoke inconclusive (HTTP ${smoke?.status ?? 'none'}) — check server logs and AUTH.md`); // prettier-ignore
    }
  } else {
    logger.fail('OPENTHROTTLE_MCP_AUTH_TOKEN is unset — every authenticated MCP tool will 401.'); // prettier-ignore
    logger.detail('This is the silent-401 trap. Fix it, then reconnect the MCP:'); // prettier-ignore
    logger.detail('  1. Provision/verify the token:  pnpm run database:bootstrap-service-accounts'); // prettier-ignore
    logger.detail('                                  (auto-rotates + writes .bootstrap-secrets.local if the'); // prettier-ignore
    logger.detail('                                   key is missing; Docker: docker compose run --rm bootstrap)'); // prettier-ignore
    logger.detail('  2. Set it in the root .env:      OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_<prefix>_<secret>'); // prettier-ignore
    logger.detail('  3. Reconnect the MCP:            /mcp reconnect  (or restart the client)'); // prettier-ignore
    logger.detail('HTTP-transport, per-request-JWT-only deployments can skip this with'); // prettier-ignore
    logger.detail('OT_MCP_ALLOW_NO_TOKEN=1. See packages/openthrottle-mcp/docs/AUTH.md.'); // prettier-ignore

    if (process.env.OT_MCP_ALLOW_NO_TOKEN !== '1') {
      process.exit(1);
    }
  }

  // HTTP transport (Docker-native) — probe the streamable-HTTP `mcp`
  // endpoint. Opt-in path: the mcp container may not be running
  // (stdio/hybrid setups), so a missing endpoint is INFO, not FAIL. Honors a
  // worktree's OPENTHROTTLE_MCP_PORT.
  const mcpUrl =
    process.env.OT_MCP_HTTP_URL ??
    `http://localhost:${process.env.OPENTHROTTLE_MCP_PORT ?? '6026'}/mcp`;

  logger.blank();
  logger.info(`HTTP transport probe → ${mcpUrl}`);

  const probe = await fetchWithTimeout(mcpUrl, 5000, {
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list', params: {} }), // prettier-ignore
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (
    probe !== undefined &&
    probe.status === 200 &&
    probe.body.includes('"tools"')
  ) {
    // prettier-ignore
    const toolCount = (probe.body.match(/"name"/g) ?? []).length;
    logger.success(`streamable-HTTP MCP reachable (tools/list → ~${toolCount} tools)`); // prettier-ignore
    logger.detail(`Register: { "type": "http", "url": "${mcpUrl}" }`);
    logger.detail('agent_conversation_* tools additionally need a per-request Authorization: Bearer <human JWT>.'); // prettier-ignore
  } else {
    logger.step(`no streamable-HTTP MCP at ${mcpUrl} (HTTP ${probe?.status ?? 'none'}).`); // prettier-ignore
    logger.detail("Fully-Dockerized: bring it up with 'docker compose --profile prod up mcp'."); // prettier-ignore
    logger.detail("Hybrid/stdio: expected — you're using the stdio launcher instead."); // prettier-ignore
    logger.detail("Worktree: set OPENTHROTTLE_MCP_PORT to this worktree's base+6 (see 'pnpm run worktree:new')."); // prettier-ignore
  }

  logger.blank();
  logger.info('Done.');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
