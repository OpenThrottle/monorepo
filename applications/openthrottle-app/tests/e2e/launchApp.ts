import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ElectronApplication } from 'playwright';
import { _electron as electron } from 'playwright';

import { PROBE_TIMEOUT_MS } from './e2e-env.ts';

export interface LaunchedApp {
  readonly app: ElectronApplication;
  readonly close: () => Promise<void>;
}

const APP_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

/**
 * @description Whether the OT server answers its /health route. Never throws:
 * an unreachable server is an expected "skip" outcome for this opt-in suite.
 */
export const isServerReachable = async (
  serverUrl: string,
): Promise<boolean> => {
  try {
    const response = await fetch(new URL('/health', serverUrl), {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * @description Launches the BUILT, unpackaged app (`out/main/main.js`) in the
 * embedded mode with an isolated userData dir, so a run never touches the
 * developer's real settings, window state or single-instance lock.
 */
export const launchApp = async (serverUrl: string): Promise<LaunchedApp> => {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'openthrottle-app-e2e-'),
  );
  const app = await electron.launch({
    args: [APP_ROOT, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      OPENTHROTTLE_APP_MODE: 'embedded',
      OPENTHROTTLE_SERVER_URL: serverUrl,
    },
  });

  const close = async (): Promise<void> => {
    await app.close().catch(() => undefined);
    await fs.rm(userDataDir, { force: true, recursive: true });
  };

  return { app, close };
};
