/**
 * @description Run the openthrottle-mcp MCP server on stdio. Invoked through
 * the thin scripts/run-openthrottle-mcp.sh shim — that path is baked into
 * user-global MCP client configs (written by setup_mcp-instructions.ts), so
 * the shim stays put and existing registrations keep working.
 *
 * stdio transport: stdout carries ONLY JSON-RPC for the MCP client. ALL
 * narration goes to stderr (the resolve-only mode's URL is the one deliberate
 * stdout exception).
 *
 * Resolves API_URL to the first REACHABLE OpenThrottle server, preferring the
 * STABLE (main/root checkout) server over this worktree's. MCP CRUD is
 * checkout-agnostic — every checkout shares the host Postgres, so plans/tasks
 * reads and writes land in the same data no matter which server answers.
 * Server choice is therefore purely a liveness/resilience concern: pin to the
 * stable server so restarting a worktree's server-under-test never interrupts
 * tooling mid-session. Execution isolation (which worker runs a plan) is NOT
 * decided here — that's the per-checkout BullMQ queue prefix
 * (OT_QUEUE_PREFIX / OT_CONTAINER_PREFIX in @openthrottle/nestjs-bullmq).
 *
 * Set OT_MCP_TARGET=worktree to prefer this worktree's server instead (e.g.
 * when testing server changes through the MCP itself); the stable server
 * remains the fallback when the worktree's is unreachable, and vice versa.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readEnvValue } from './lib/env.ts';
import { gitOutput, primaryCheckoutDir } from './lib/git.ts';
import { createLogger, run } from './lib/index.ts';
import { classifyAuthSmoke } from './verify-openthrottle-mcp-env.ts';

const logger = createLogger({ stream: process.stderr });

/**
 * MCP clients that can't expand `${VAR}` from .mcp.json's env block pass the
 * literal placeholder through when the var is unset in their launching shell.
 * That literal is non-empty, so a bare emptiness guard would send it as a
 * bearer token → server 401. Treat any value containing "${" as unset.
 */
export const isUnexpandedPlaceholder = (value: string | undefined): boolean =>
  value !== undefined && value.includes('${');

/**
 * The first published host port of a running container whose name mentions
 * "server", from `docker ps --format '{{.Names}}\t{{.Ports}}'` output.
 */
export const parseDockerServerPort = (psOutput: string): string | undefined => {
  const line = psOutput
    .split('\n')
    .find((candidate) => candidate.toLowerCase().includes('server'));

  return line?.match(/:(\d+)->/)?.[1];
};

export interface CandidateInputs {
  dockerUrl?: string;
  rootUrl?: string;
  /** OT_MCP_TARGET — 'worktree' prefers this worktree's server. */
  target?: string;
  worktreeUrl?: string;
}

/**
 * Candidate server URLs in priority order (STABLE-FIRST by default; see the
 * module doc), de-duplicated, always ending on the canonical fallback.
 */
export const buildCandidateUrls = (inputs: CandidateInputs): string[] => {
  const ordered: (string | undefined)[] = [];

  if (inputs.target === 'worktree') {
    // Explicit opt-in: prefer this worktree's server.
    ordered.push(inputs.worktreeUrl, inputs.rootUrl, inputs.dockerUrl);
  } else {
    // Default: stable-first; worktree server as liveness fallback.
    ordered.push(inputs.rootUrl, inputs.dockerUrl, inputs.worktreeUrl);
  }

  ordered.push('http://localhost:6021');

  const result: string[] = [];

  for (const url of ordered) {
    if (url !== undefined && url !== '' && !result.includes(url)) {
      result.push(url);
    }
  }

  return result;
};

const probe = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) }); // prettier-ignore

    return response.ok;
  } catch {
    return false;
  }
};

const authFailBanner = (reason: string, apiUrl: string): void => {
  logger.blank();
  logger.fail(`openthrottle-mcp: refusing to start — ${reason}`);
  logger.detail(`Server: ${apiUrl}`);
  logger.detail('Fix:');
  logger.detail('  1. Provision/verify the token:  pnpm run database:bootstrap-service-accounts'); // prettier-ignore
  logger.detail('  2. Set it in the root .env:      OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_<prefix>_<secret>'); // prettier-ignore
  logger.detail('  3. Reconnect the MCP:            /mcp reconnect   (or restart the client)'); // prettier-ignore
  logger.detail('Details: packages/openthrottle-mcp/docs/AUTH.md');
  logger.blank();
};

const main = async (): Promise<void> => {
  logger.detail(`🔍 Using Node.js version: ${process.version}`);

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  process.chdir(root);

  // Worktree-aware identity: basename of git root (e.g. monorepo-worktree-one)
  // so each worktree advertises a distinct MCP server name.
  const gitRoot = gitOutput(['rev-parse', '--show-toplevel']);
  const env: Record<string, string | undefined> = { ...process.env };

  if (gitRoot !== undefined) {
    env.WORKTREE_ID = gitRoot.split('/').pop();
  } else {
    delete env.WORKTREE_ID;
  }

  // --- Resolve a LIVE OpenThrottle server (reads .env vars WITHOUT sourcing).
  const worktreeUrl = readEnvValue(join(root, '.env'), 'OPENTHROTTLE_SERVER_APP_URL'); // prettier-ignore

  // The main/root checkout's .env (the shared STABLE server).
  const rootRepo = primaryCheckoutDir();
  const rootUrl =
    rootRepo === undefined
      ? ''
      : readEnvValue(join(rootRepo, '.env'), 'OPENTHROTTLE_SERVER_APP_URL');

  // A running docker "server" container's published host port (covers the
  // case where neither .env matched the only live server).
  const dockerPs = run('docker', ['ps', '--format', '{{.Names}}\t{{.Ports}}'], { allowFailure: true }); // prettier-ignore
  const dockerPort =
    dockerPs.exitCode === 0 ? parseDockerServerPort(dockerPs.stdout) : undefined; // prettier-ignore

  const candidates = buildCandidateUrls({
    dockerUrl: dockerPort === undefined ? undefined : `http://localhost:${dockerPort}`, // prettier-ignore
    rootUrl,
    target: process.env.OT_MCP_TARGET,
    worktreeUrl,
  });

  let apiUrl = '';

  /* eslint-disable no-await-in-loop -- priority-ordered probing: stop at the first live server */
  for (const url of candidates) {
    if (await probe(url)) {
      apiUrl = url;
      logger.detail(`✅ openthrottle-mcp -> live server at ${url}`);
      break;
    }

    logger.detail(`   …no OpenThrottle server at ${url}`);
  }
  /* eslint-enable no-await-in-loop */

  if (apiUrl === '') {
    logger.blank();
    logger.fail('openthrottle-mcp: no reachable OpenThrottle server found.');
    logger.detail(`Tried (in order): ${candidates.join(' ')}`);
    logger.detail("Worktrees share the MAIN checkout's server — they do not start their own."); // prettier-ignore
    logger.detail('Start it from the main checkout:');
    logger.detail('    pnpm run database:start && pnpm nx run openthrottle-server:dev'); // prettier-ignore
    process.exit(1);
  }

  env.API_URL = apiUrl;
  env.API_URL_INTERNAL = apiUrl;

  // Load the OT GraphQL auth token the same way we resolve the server: from
  // this worktree's .env, falling back to the main/root checkout's .env.
  // Don't fail if it is absent — the server may inject it another way.
  //
  // When the token is self-loaded FROM a .env file, also record that file's
  // absolute path in OT_MCP_AUTH_TOKEN_ENV_FILE. The Node process re-reads it
  // mid-session (packages/openthrottle-mcp/src/auth/get-auth-token.ts:
  // refreshEnvAuthTokenFromFile) so a token ROTATED in .env is picked up
  // WITHOUT a relaunch. It is deliberately NOT set when the token came from
  // an exported shell var: that shell is then the source of truth.
  if (isUnexpandedPlaceholder(env.OPENTHROTTLE_MCP_AUTH_TOKEN)) {
    delete env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  }

  if (
    env.OPENTHROTTLE_MCP_AUTH_TOKEN === undefined ||
    env.OPENTHROTTLE_MCP_AUTH_TOKEN === ''
  ) {
    // prettier-ignore
    const worktreeToken = readEnvValue(join(root, '.env'), 'OPENTHROTTLE_MCP_AUTH_TOKEN'); // prettier-ignore
    const rootToken =
      rootRepo === undefined
        ? ''
        : readEnvValue(join(rootRepo, '.env'), 'OPENTHROTTLE_MCP_AUTH_TOKEN');

    if (worktreeToken !== '') {
      env.OPENTHROTTLE_MCP_AUTH_TOKEN = worktreeToken;
      env.OT_MCP_AUTH_TOKEN_ENV_FILE = join(root, '.env');
    } else if (rootToken !== '' && rootRepo !== undefined) {
      env.OPENTHROTTLE_MCP_AUTH_TOKEN = rootToken;
      env.OT_MCP_AUTH_TOKEN_ENV_FILE = join(rootRepo, '.env');
    }
  }

  // Resolve-only mode: print the chosen server and exit (tests/health checks).
  if ((process.env.OT_MCP_RESOLVE_ONLY ?? '') !== '') {
    process.stdout.write(`${apiUrl}\n`);

    return;
  }

  // --- Preflight auth check (fail loudly; never present a silently-broken
  // MCP). The client connects over stdio and lists tools regardless of token
  // validity, so a bad token otherwise surfaces only as a 401 on EVERY
  // authenticated call mid-session. Opt out with OT_MCP_SKIP_PREFLIGHT=1.
  if ((process.env.OT_MCP_SKIP_PREFLIGHT ?? '') === '') {
    const token = env.OPENTHROTTLE_MCP_AUTH_TOKEN ?? '';

    if (token === '') {
      authFailBanner("OPENTHROTTLE_MCP_AUTH_TOKEN is unset (not in the launching env, this worktree's .env, or the root .env).", apiUrl); // prettier-ignore
      process.exit(1);
    }

    let smoke: { body: string; status: number } | undefined;
    try {
      const response = await fetch(`${apiUrl}/graphql`, {
        body: JSON.stringify({ query: 'query { listSources { sources { name } } }' }), // prettier-ignore
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      });
      smoke = { body: await response.text(), status: response.status };
    } catch {
      smoke = undefined;
    }

    const verdict =
      smoke === undefined
        ? 'inconclusive'
        : classifyAuthSmoke(smoke.status, smoke.body);

    if (verdict === 'rejected') {
      authFailBanner(`server rejected the token: ${smoke?.body.slice(0, 200) ?? `HTTP ${smoke?.status}`}`, apiUrl); // prettier-ignore
      process.exit(1);
    } else if (verdict === 'ok') {
      logger.detail(`🔓 openthrottle-mcp: auth OK (token verified against ${apiUrl})`); // prettier-ignore
    } else {
      // Transient/ambiguous (timeout, 5xx). Don't block tooling on a hiccup.
      logger.warn(`openthrottle-mcp: auth preflight inconclusive (HTTP ${smoke?.status ?? 'none'}); starting anyway. If tools 401, run pnpm run verify:mcp-env`); // prettier-ignore
    }
  }

  // Semantic search embeddings are configured on openthrottle-server
  // (OPENAI_API_KEY or OLLAMA_* in applications/openthrottle-server/.env),
  // not in this launcher. See docs/openthrottle/run-locally-oss.md.
  const outcome = spawnSync('node', ['packages/openthrottle-mcp/dist/src/bin.js'], { cwd: root, env, stdio: 'inherit' }); // prettier-ignore

  process.exit(outcome.status ?? 1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
