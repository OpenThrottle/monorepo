/**
 * Antigravity (`agy`) coverage-heartbeat entrypoint (`SessionStart` hook). One small record per
 * session start; see `src/data/heartbeat.ts` for what it carries.
 *
 * Keyed off `SessionStart`, which fires once per new session under `agy -p` (measured on agy
 * 1.5.9) and over `agy acp`; a turn resumed with `session/load` fires none, which is right for a
 * heartbeat. Registered by the workspace plugin `.agents/plugins/openthrottle/`, which agy runs
 * with cwd = the plugin folder, so the leg is read from where this script lives and is `repo` for
 * that registration. agy's out-of-repo hook route is unprobed and there is no marketplace record
 * to read. Fail-open: always exits 0, silent when no endpoint resolves.
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
import { ANTIGRAVITY_SOURCE } from './payload.ts';

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
      source: ANTIGRAVITY_SOURCE,
    });
  } catch (err) {
    logHookError('heartbeat failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
