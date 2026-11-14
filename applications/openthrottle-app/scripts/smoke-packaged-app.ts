// Smoke-tests a PACKAGED OpenThrottle.app the way a user's download runs it:
//
//   1. ditto the bundle out of the repo into a temp dir (no repo node_modules
//      or .env can leak in by relative path),
//   2. start a stub OT server (main probes the configured server before it
//      starts the embedded child; the stub needs no Postgres or Redis),
//   3. launch the app with an EMPTY environment (`env -i`) except
//      OPENTHROTTLE_SERVER_URL, and a fresh --user-data-dir,
//   4. read the embedded port from the `[openthrottle-server] listening on`
//      stderr line, wait for /__shell/health, then check GET /auth and
//      POST /graphql (proxied to the stub),
//   5. kill the app and confirm the embedded server went with it.
//
// Exits non-zero on any failure, so a release job can gate on it. Opt-in
// locally: `pnpm nx run openthrottle-app:smoke-package` after `package`.
// Pass a bundle path to test another build, and `--arch x64` to launch the
// x64 slice of a universal bundle under Rosetta.
import type { ChildProcess } from 'node:child_process';
import { execFile, spawn } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';

import {
  APP_EXECUTABLE,
  PACKAGED_APP_PATH,
  SMOKE_TIMEOUTS,
  SMOKE_TIMEOUTS_ROSETTA,
} from './data/data.smoke.ts';
import { createStubOtServer } from './utils/createStubOtServer.ts';
import { parseListeningOrigin } from './utils/parseListeningOrigin.ts';
import { buildSmokeLaunchCommand, parseSmokeArgs } from './utils/smoke-args.ts';
import type { SmokeCheckResult } from './utils/smoke-checks.ts';
import { runSmokeChecks, waitForShellHealth } from './utils/smoke-checks.ts';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const run = promisify(execFile);

type SmokeTimeouts = {
  readonly [TKey in keyof typeof SMOKE_TIMEOUTS]: number;
};

const log = (message: string): void => {
  process.stdout.write(`[smoke-package] ${message}\n`);
};

const fail = (message: string): never => {
  process.stderr.write(`[smoke-package] ${message}\n`);
  process.exit(1);
};

/** Resolves with the origin once the listening line appears, or rejects. */
const waitForOrigin = (
  child: ChildProcess,
  output: string[],
  bootMs: number,
): Promise<string> => {
  return new Promise((resolveOrigin, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`no listening line after ${bootMs} ms`));
    }, bootMs);

    const onData = (chunk: Buffer): void => {
      output.push(chunk.toString());
      const origin = parseListeningOrigin(output.join(''));

      if (origin !== undefined) {
        clearTimeout(timer);
        resolveOrigin(origin);
      }
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`app exited before listening (${code ?? signal})`));
    });
  });
};

/** SIGTERM, then SIGKILL if the app has not exited within the budget. */
const stopApp = async (
  child: ChildProcess,
  shutdownMs: number,
): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exited = new Promise<void>((resolveExit) => {
    child.once('exit', () => {
      resolveExit();
    });
  });

  child.kill('SIGTERM');

  const timedOut = await Promise.race([
    exited.then(() => {
      return false;
    }),
    sleep(shutdownMs).then(() => {
      return true;
    }),
  ]);

  if (timedOut) {
    log(`app ignored SIGTERM for ${shutdownMs} ms; SIGKILL`);
    child.kill('SIGKILL');
    await exited;
  }
};

/** After the app exits, its embedded server must stop answering. */
const checkServerGone = async (
  origin: string,
  timeouts: SmokeTimeouts,
): Promise<SmokeCheckResult> => {
  const name = 'embedded server exits with the app';

  await sleep(timeouts.healthInterval);

  try {
    await fetch(origin, {
      signal: AbortSignal.timeout(timeouts.request),
    });

    return {
      detail: `${origin} still answers (orphaned child)`,
      name,
      ok: false,
    };
  } catch {
    return { detail: 'connection refused', name, ok: true };
  }
};

const report = (results: readonly SmokeCheckResult[]): boolean => {
  results.forEach((result) => {
    log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name} — ${result.detail}`);
  });

  return results.every((result) => result.ok);
};

const main = async (): Promise<void> => {
  if (process.platform !== 'darwin') {
    fail('the packaged app is macOS-only; run this on a Mac');
  }

  const smokeArgs = parseSmokeArgs(process.argv.slice(2), PACKAGED_APP_PATH);

  if (!smokeArgs.ok) {
    return fail(smokeArgs.reason);
  }

  const source = resolve(PROJECT_ROOT, smokeArgs.appPath);
  const isRosetta = smokeArgs.arch === 'x64';
  const timeouts: SmokeTimeouts = isRosetta
    ? SMOKE_TIMEOUTS_ROSETTA
    : SMOKE_TIMEOUTS;

  await access(source).catch(() => {
    return fail(
      `no packaged app at ${source}; run \`pnpm nx run openthrottle-app:package\` first`,
    );
  });

  const workDir = await mkdtemp(join(tmpdir(), 'ot-smoke-'));
  const bundle = join(workDir, 'OpenThrottle.app');
  const stub = await createStubOtServer();
  const output: string[] = [];
  const results: SmokeCheckResult[] = [];
  let child: ChildProcess | undefined;

  try {
    log(`ditto ${source} -> ${bundle}`);
    await run('ditto', [source, bundle]);

    log(`stub OT server on ${stub.origin}`);

    const launch = buildSmokeLaunchCommand(
      join(bundle, APP_EXECUTABLE),
      [
        `--user-data-dir=${join(workDir, 'user-data')}`,
        '--enable-logging=stderr',
      ],
      smokeArgs.arch,
    );

    log(`launching (${smokeArgs.arch}) ${launch.command}`);
    child = spawn(launch.command, launch.args, {
      // `env -i`: nothing from this shell (PATH, HOME, NODE_OPTIONS, a .env
      // loaded by a wrapper) reaches the app except the one setting it needs.
      env: { OPENTHROTTLE_SERVER_URL: stub.origin },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const origin = await waitForOrigin(child, output, timeouts.boot);

    log(`embedded server on ${origin}`);

    const health = await waitForShellHealth({
      fetch,
      intervalMs: timeouts.healthInterval,
      now: Date.now,
      origin,
      sleep: (ms) => {
        return sleep(ms);
      },
      timeoutMs: timeouts.health,
    });

    results.push(health);

    if (health.ok) {
      const before = stub.graphqlRequests();

      results.push(
        ...(await runSmokeChecks({
          fetch,
          origin,
          timeoutMs: timeouts.request,
        })),
      );

      const proxied = stub.graphqlRequests() - before;

      results.push({
        detail: `${proxied} request(s) reached the stub`,
        name: 'POST /graphql reached the OT server through the proxy',
        ok: proxied > 0,
      });
    }

    await stopApp(child, timeouts.shutdown);
    results.push(await checkServerGone(origin, timeouts));
  } catch (error) {
    results.push({
      detail: error instanceof Error ? error.message : String(error),
      name: 'app boot',
      ok: false,
    });
  } finally {
    if (child !== undefined) {
      await stopApp(child, timeouts.shutdown);
    }

    await stub.close();
    await rm(workDir, { force: true, recursive: true });
  }

  if (!report(results)) {
    process.stderr.write(`\n--- app output ---\n${output.join('')}\n`);
    fail('smoke test FAILED');
  }

  log('smoke test passed');
};

await main();
