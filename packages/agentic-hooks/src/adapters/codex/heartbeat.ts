/**
 * Codex coverage-heartbeat entrypoint (`SessionStart` hook). One small record per session start;
 * see `src/data/heartbeat.ts` for what it carries.
 *
 * Keyed off `SessionStart`, which fires once per session in a headless `codex exec` run, with
 * `source: "startup"` (measured on codex-cli 0.167.0;
 * docs/monorepo/agent-cli-hook-capability-matrix.md). Codex has no plugin-root variable and no
 * `--plugin-dir`: hooks come from `~/.codex/config.toml`, a trusted project's `.codex/`, or a
 * marketplace plugin. So the leg is read from where this script lives — inside the repository is
 * `repo`, under `$CODEX_HOME/plugins/cache/` is `marketplace`, anywhere else (a home config pointing
 * at another checkout's bundle) is `plugin-dir`. The marketplace install is read from
 * `config.toml` and that cache — see `marketplace-install.ts`. Fail-open: always exits 0, silent
 * when no endpoint resolves.
 */
import os from 'node:os';
import path from 'node:path';

import {
  detectDeliveryLegFromScript,
  isTelemetryDisabled,
  logHookError,
  readHookPayloadCwd,
  readHookStdin,
  readTextOrNull,
  resolveHookRepoRoot,
  sendHeartbeat,
} from '../../index.ts';
import {
  readCodexMarketplaceInstall,
  resolveCodexHome,
  resolveCodexMarketplaceCacheDir,
} from './marketplace-install.ts';
import { CODEX_SOURCE } from './payload.ts';

const main = async (): Promise<void> => {
  try {
    if (isTelemetryDisabled()) {
      return;
    }

    const repoRoot = resolveHookRepoRoot({
      payloadCwd: readHookPayloadCwd(readHookStdin()),
      projectDir: process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd(),
    });
    const codexHome = resolveCodexHome(process.env, os.homedir());
    const marketplaceCacheDir = resolveCodexMarketplaceCacheDir(codexHome);

    await sendHeartbeat({
      deliveryLeg: detectDeliveryLegFromScript({
        env: process.env,
        marketplaceCacheDir,
        repoRoot,
        scriptPath: process.argv[1],
      }),
      marketplace: readCodexMarketplaceInstall({
        cacheDir: marketplaceCacheDir,
        configToml: readTextOrNull(path.join(codexHome, 'config.toml')),
      }),
      pluginVersion: null,
      repoRoot,
      source: CODEX_SOURCE,
    });
  } catch (err) {
    logHookError('heartbeat failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
