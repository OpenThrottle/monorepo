import { SHELL_HEALTH_PATH } from '../../src/main/data/data.server-env.ts';
import { SERVER_HEALTH_QUERY } from '../../src/main/data/data.settings.ts';

export type SmokeFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface SmokeCheckResult {
  readonly detail: string;
  readonly name: string;
  readonly ok: boolean;
}

export interface WaitForShellHealthOptions {
  readonly fetch: SmokeFetch;
  readonly intervalMs: number;
  readonly now: () => number;
  readonly origin: string;
  readonly sleep: (ms: number) => Promise<void>;
  readonly timeoutMs: number;
}

export interface RunSmokeChecksOptions {
  readonly fetch: SmokeFetch;
  readonly origin: string;
  readonly timeoutMs: number;
}

interface SmokeCheck {
  readonly init: RequestInit | undefined;
  readonly name: string;
  readonly path: string;
  readonly verify: (response: Response) => Promise<string | undefined>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : '';

  return `${error.message}${cause}`;
};

const readShellHealth = async (
  fetch: SmokeFetch,
  url: string,
): Promise<string> => {
  try {
    const response = await fetch(url);
    const body = await response.text();

    return `${response.status} ${body}`;
  } catch (error) {
    return describeError(error);
  }
};

/**
 * @description Polls the embedded server's `/__shell/health` until it answers
 * `200 ok`. It answers `503 starting` until the React Router handler is
 * mounted, so a 503 is expected for the first few seconds. Resolves with the
 * last answer when the budget runs out.
 */
export const waitForShellHealth = async (
  options: WaitForShellHealthOptions,
): Promise<SmokeCheckResult> => {
  const { fetch, intervalMs, now, origin, sleep, timeoutMs } = options;
  const url = `${origin}${SHELL_HEALTH_PATH}`;
  const deadline = now() + timeoutMs;

  const poll = async (): Promise<SmokeCheckResult> => {
    const answer = await readShellHealth(fetch, url);

    if (answer === '200 ok') {
      return { detail: answer, name: SHELL_HEALTH_PATH, ok: true };
    }

    if (now() >= deadline) {
      return {
        detail: `not ready after ${timeoutMs} ms, last answer: ${answer}`,
        name: SHELL_HEALTH_PATH,
        ok: false,
      };
    }

    await sleep(intervalMs);

    return poll();
  };

  return poll();
};

const verifyHtmlPage = async (
  response: Response,
): Promise<string | undefined> => {
  const type = response.headers.get('content-type') ?? '';
  const body = await response.text();

  if (response.status !== 200) {
    return `expected 200, got ${response.status}`;
  }

  if (!type.includes('text/html') || !body.includes('<html')) {
    return `expected an HTML page, got ${type || 'no content-type'}`;
  }

  return undefined;
};

const verifyProxiedHealth = async (
  response: Response,
): Promise<string | undefined> => {
  if (response.status !== 200) {
    return `expected 200, got ${response.status}`;
  }

  const body: unknown = await response.json().catch(() => {
    return undefined;
  });
  const data = isRecord(body) ? body['data'] : undefined;
  const health = isRecord(data) ? data['serverHealth'] : undefined;

  if (!isRecord(health) || health['api'] !== 'ok') {
    return 'expected a serverHealth answer with api "ok" from the OT server';
  }

  return undefined;
};

const SMOKE_CHECKS: readonly SmokeCheck[] = [
  {
    init: undefined,
    name: 'GET /auth (developer SSR route)',
    path: '/auth',
    verify: verifyHtmlPage,
  },
  {
    init: {
      body: JSON.stringify({ query: SERVER_HEALTH_QUERY }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
    name: 'POST /graphql (proxied to the OT server)',
    path: '/graphql',
    verify: verifyProxiedHealth,
  },
];

const runCheck = async (
  check: SmokeCheck,
  options: RunSmokeChecksOptions,
): Promise<SmokeCheckResult> => {
  const { fetch, origin, timeoutMs } = options;

  try {
    const response = await fetch(`${origin}${check.path}`, {
      ...check.init,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const failure = await check.verify(response);

    return {
      detail: failure ?? `${response.status}`,
      name: check.name,
      ok: failure === undefined,
    };
  } catch (error) {
    return { detail: describeError(error), name: check.name, ok: false };
  }
};

/**
 * @description The checks a packaged app must pass once its embedded server
 * is ready: the developer app renders a server-side route, and `/graphql` is
 * reverse-proxied to the configured OT server. Every check runs; none
 * short-circuits the others, so one report shows everything that is broken.
 */
export const runSmokeChecks = async (
  options: RunSmokeChecksOptions,
): Promise<readonly SmokeCheckResult[]> => {
  return Promise.all(
    SMOKE_CHECKS.map((check) => {
      return runCheck(check, options);
    }),
  );
};
