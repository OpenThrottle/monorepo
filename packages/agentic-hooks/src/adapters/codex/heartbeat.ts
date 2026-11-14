/**
 * Codex coverage-heartbeat entrypoint (`SessionStart` hook). One small record per session start;
 * see `src/data/heartbeat.ts` for what it carries.
 *
 * Keyed off `SessionStart`, which fires once per session in a headless `codex exec` run, with
 * `source: "startup"` (measured on codex-cli 0.167.0;
 * docs/monorepo/agent-cli-hook-capability-matrix.md). Codex has no plugin-root variable and no
 * `--plugin-dir`: hooks come from `~/.codex/config.toml` or a trusted project's `.codex/`. So the
 * leg is read from where this script lives — inside the repository is `repo`, a home config
 * pointing at another checkout's bundle is `plugin-dir` — and there is no marketplace record to
 * read. Fail-open: always exits 0, silent when no endpoint resolves.
 */
import {
  detectDeliveryLegFromScript,
  logHookError,
  readHookPayloadCwd,
  readHookStdin,
  resolveHookRepoRoot,
  sendHeartbeat,
  UNKNOWN_MARKETPLACE_INSTALL,
} from '../../index.ts';
import { CODEX_SOURCE } from './payload.ts';

const main = async (): Promise<void> => {
  try {
    const repoRoot = resolveHookRepoRoot({
      payloadCwd: readHookPayloadCwd(readHookStdin()),
      projectDir: process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd(),
    });

    await sendHeartbeat({
      deliveryLeg: detectDeliveryLegFromScript({
        env: process.env,
        repoRoot,
        scriptPath: process.argv[1],
      }),
      marketplace: UNKNOWN_MARKETPLACE_INSTALL,
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
