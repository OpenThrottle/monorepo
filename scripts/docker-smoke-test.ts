/**
 * @description Docker smoke-test matrix for the OpenThrottle compose stacks.
 * Backs OT plan ba18d88d-0a65-47c5-8b90-adc83d3f4ca7 (Docker dev workflow).
 *
 * Modes (pick one, default `prod`):
 *   prod      — production parity: docker compose up --build (root), assert
 *               server /health 200 + developer / 200 (after auth redirect).
 *   dev       — dev profile: docker compose --profile dev watch (root), assert
 *               server /health 200 + developer / 200 (after auth redirect)
 *               against the dev images.
 *   consumer  — consumer install: applications/openthrottle compose from
 *               published images, assert first-boot migrate/seed + server health.
 *
 * Usage: tsx scripts/docker-smoke-test.ts [prod|dev|consumer]
 *
 * Notes:
 *   - Reads ports from the repo-root .env (falls back to the 60xx defaults).
 *   - dev mode starts `watch` in the background and tears it down on exit.
 *   - This is a thin orchestration wrapper around docker compose; it does not
 *     build/publish images.
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readEnvValue } from './lib/env.ts';
import { createLogger, positionals } from './lib/index.ts';

const logger = createLogger();

export const SMOKE_MODES = ['consumer', 'dev', 'prod'] as const;
export type SmokeMode = (typeof SMOKE_MODES)[number];

/** Narrow an argv token to a mode; undefined = unknown (caller fails). */
export const parseMode = (raw: string | undefined): SmokeMode | undefined => {
  if (raw === undefined || raw === '') {
    return 'prod';
  }

  return SMOKE_MODES.find((mode) => mode === raw);
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Poll an HTTP endpoint until it returns the expected status (or time out).
 * `follow` follows redirects — the developer app 302s unauthenticated
 * visitors from / to /auth, which serves the 200.
 */
const waitHttp = async (
  url: string,
  want: number,
  label: string,
  tries = 60,
  follow = false,
): Promise<void> => {
  logger.heading(`Waiting for ${label} (${url} → ${want})`);

  /* eslint-disable no-await-in-loop -- polling: each probe must finish before the next */
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    let status = 0;
    try {
      const response = await fetch(url, {
        redirect: follow ? 'follow' : 'manual',
        signal: AbortSignal.timeout(3000),
      });
      status = response.status;
    } catch {
      status = 0;
    }

    if (status === want) {
      logger.success(`${label} healthy (${status}) after ~${attempt * 5}s`);

      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  /* eslint-enable no-await-in-loop */

  logger.fail(`${label} did not reach ${want} in time`);
  process.exit(1);
};

const compose = (args: string[], cwd: string = root): void => {
  const outcome = spawnSync('docker', ['compose', ...args], { cwd, stdio: 'inherit' }); // prettier-ignore

  if (outcome.status !== 0 || outcome.error) {
    logger.fail(`docker compose ${args.join(' ')} failed`);
    process.exit(1);
  }
};

const main = async (): Promise<void> => {
  const mode = parseMode(positionals()[0]);

  if (mode === undefined) {
    logger.fail(`Unknown mode '${positionals()[0]}' (expected: prod | dev | consumer)`); // prettier-ignore
    process.exit(1);
  }

  // Load ports from .env when present (without exporting the whole file).
  const serverPort = readEnvValue(join(root, '.env'), 'OPENTHROTTLE_SERVER_PORT', '6021'); // prettier-ignore
  const developerPort = readEnvValue(join(root, '.env'), 'OPENTHROTTLE_DEVELOPER_PORT', '6020'); // prettier-ignore

  const serverHealth = `http://localhost:${serverPort}/health`;
  const developerHome = `http://localhost:${developerPort}/`;

  if (mode === 'prod') {
    logger.heading('PROD parity — docker compose up --build');
    compose(['--profile', 'prod', 'up', '--build', '-d']);
    await waitHttp(serverHealth, 200, 'server /health');
    await waitHttp(developerHome, 200, 'developer /', 60, true);
    logger.success('Production parity OK');

    return;
  }

  if (mode === 'dev') {
    logger.heading('DEV profile — docker compose --profile dev watch (background)'); // prettier-ignore

    const logFile = openSync(join(tmpdir(), 'ot-smoke-dev.log'), 'w');
    const watch = spawn('docker', ['compose', '--profile', 'dev', 'watch'], {
      cwd: root,
      stdio: ['ignore', logFile, logFile],
    });

    const teardown = (): void => {
      try {
        watch.kill();
      } catch {
        // Already gone.
      }

      spawnSync('docker', ['compose', '--profile', 'dev', 'down'], { cwd: root, stdio: 'inherit' }); // prettier-ignore
    };

    process.on('exit', teardown);
    process.on('SIGINT', () => process.exit(130));
    process.on('SIGTERM', () => process.exit(143));

    await waitHttp(serverHealth, 200, 'server-dev /health', 90);
    await waitHttp(developerHome, 200, 'developer-dev /', 60, true);
    logger.success('Dev profile OK (edit a resolver/route and re-curl to confirm hot reload)'); // prettier-ignore

    return;
  }

  // consumer
  const dir = join(root, 'applications/openthrottle');
  logger.heading(`CONSUMER install — ${dir} (published images)`);

  if (!existsSync(join(dir, '.env'))) {
    copyFileSync(join(dir, '.env.default'), join(dir, '.env'));
    logger.step(`created ${dir}/.env from .env.default`);
  }

  compose(['up', '-d'], dir);

  // Server depends_on migrations (service_completed_successfully) + healthy
  // db, so a healthy server implies first-boot seed + migrate succeeded.
  await waitHttp(serverHealth, 200, 'server /health (after migrate/seed)', 90);
  await waitHttp(developerHome, 200, 'developer /', 60, true);
  logger.success('Consumer install OK');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
