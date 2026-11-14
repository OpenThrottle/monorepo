/**
 * Claude Code coverage-heartbeat entrypoint (SessionStart hook). One small record per session
 * start saying which machine, through which delivery leg, in which repo, with what sitting in the
 * local telemetry buffer (docs/monorepo/child-repo-hook-telemetry-contract.md §8). Fail-open:
 * always exits 0, silent when no endpoint resolves.
 */
import {
  logHookError,
  readHookPayloadCwd,
  readHookStdin,
  resolveHookRepoRoot,
} from '../../index.ts';
import {
  detectClaudeBundleHost,
  resolveBundleHostProjectDir,
} from './bundle-host.ts';
import {
  isForeignHostHeartbeatShadowed,
  runForeignHostHeartbeat,
} from './foreign-host-heartbeat.ts';
import { runHeartbeat } from './runHeartbeat.ts';
import { isShadowedByRepoHooks } from './shadow.ts';

const main = async (): Promise<void> => {
  try {
    const host = detectClaudeBundleHost();
    const projectDir = resolveBundleHostProjectDir(host);

    // Another tool is running this bundle (a marketplace install it picked up): report as that
    // tool, unless its own registration of the heartbeat is about to send the one heartbeat.
    if (host !== 'claude-code') {
      const repoRoot = resolveHookRepoRoot({
        payloadCwd: readHookPayloadCwd(readHookStdin()),
        projectDir,
      });
      if (!isForeignHostHeartbeatShadowed({ host, repoRoot })) {
        await runForeignHostHeartbeat({ host, repoRoot });
      }
      return;
    }

    // The repository registers this same hook; let that copy send the one heartbeat.
    if (
      isShadowedByRepoHooks({
        bundle: 'skill-usage-heartbeat',
        repoRoot: projectDir,
      })
    ) {
      return;
    }

    const repoRoot = resolveHookRepoRoot({
      payloadCwd: readHookPayloadCwd(readHookStdin()),
      projectDir,
    });

    await runHeartbeat({ repoRoot });
  } catch (err) {
    logHookError('heartbeat failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
