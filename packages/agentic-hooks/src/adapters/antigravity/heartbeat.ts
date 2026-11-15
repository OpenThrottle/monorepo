/**
 * Antigravity (`agy`) coverage-heartbeat entrypoint (`SessionStart` hook). One small record per
 * session start; see `src/data/heartbeat.ts` for what it carries.
 *
 * Keyed off `SessionStart`, which fires once per new session under `agy -p` (measured on agy
 * 1.5.9) and over `agy acp`; a turn resumed with `session/load` fires none, which is right for a
 * heartbeat. Registered by the workspace plugin `.agents/plugins/openthrottle/`, which agy runs
 * with cwd = the plugin folder, so the leg is read from where this script lives and is `repo` for
 * that registration; a copy under agy's user plugin directory (`~/.gemini/config/plugins/`) is
 * `marketplace`. The install itself is read from that directory — see `marketplace-install.ts`.
 * Fail-open: always exits 0, silent when no endpoint resolves.
 */
import os from 'node:os';
import path from 'node:path';

import {
  detectDeliveryLegFromScript,
  logHookError,
  readHookPayloadCwd,
  readHookStdin,
  readTextOrNull,
  resolveHookRepoRoot,
  sendHeartbeat,
} from '../../index.ts';
import {
  readAntigravityMarketplaceInstall,
  resolveAntigravityPluginsDir,
} from './marketplace-install.ts';
import { ANTIGRAVITY_SOURCE } from './payload.ts';

const main = async (): Promise<void> => {
  try {
    const repoRoot = resolveHookRepoRoot({
      payloadCwd: readHookPayloadCwd(readHookStdin()),
      projectDir: process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd(),
    });
    const pluginsDir = resolveAntigravityPluginsDir(os.homedir());

    await sendHeartbeat({
      deliveryLeg: detectDeliveryLegFromScript({
        env: process.env,
        marketplaceCacheDir: pluginsDir,
        repoRoot,
        scriptPath: process.argv[1],
      }),
      marketplace: readAntigravityMarketplaceInstall({
        configJson: readTextOrNull(
          path.join(path.dirname(pluginsDir), 'config.json'),
        ),
        pluginsDir,
      }),
      pluginVersion: null,
      repoRoot,
      source: ANTIGRAVITY_SOURCE,
    });
  } catch (err) {
    logHookError('heartbeat failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
