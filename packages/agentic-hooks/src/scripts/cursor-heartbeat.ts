/**
 * Cursor coverage-heartbeat entrypoint (`sessionStart` hook). One small record per session start;
 * see `../data/heartbeat.ts` for what it carries and `../utils/cursor-heartbeat.ts` for Cursor's own facts.
 *
 * Keyed off `sessionStart`, which fires once per session in a headless `-p` run (measured on
 * cursor-agent 2026.11.11 and 2026.11.13; docs/monorepo/agent-cli-hook-capability-matrix.md). The
 * payload carries `user_email`; only the working directory is read from it. Fail-open: always
 * exits 0, silent when no endpoint resolves.
 */
import {
  isTelemetryDisabled,
  logHookError,
  readHookStdin,
  resolveHookRepoRoot,
} from '../index.ts';
import {
  isCursorHeartbeatShadowed,
  runCursorHeartbeat,
} from '../utils/cursor-heartbeat.ts';
import { readCursorPayloadCwd } from '../utils/cursor-payload.ts';

/** The payload's working directory, or null when stdin is empty or not JSON. */
const readPayloadCwd = (): string | null => {
  try {
    return readCursorPayloadCwd(JSON.parse(readHookStdin()));
  } catch {
    // An empty or malformed payload just means no cwd; the heartbeat does not need one.
    return null;
  }
};

const main = async (): Promise<void> => {
  try {
    if (isTelemetryDisabled()) {
      return;
    }

    const projectDir =
      process.env.CURSOR_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    const repoRoot = resolveHookRepoRoot({
      payloadCwd: readPayloadCwd(),
      projectDir,
    });

    if (isCursorHeartbeatShadowed({ repoRoot })) {
      return;
    }

    await runCursorHeartbeat({ repoRoot });
  } catch (err) {
    logHookError('heartbeat failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
