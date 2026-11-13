/**
 * Claude Code coverage-heartbeat entrypoint (SessionStart hook). One small record per session
 * start saying which machine, through which delivery leg, in which repo, with what sitting in the
 * local telemetry buffer (docs/monorepo/child-repo-hook-telemetry-contract.md §8). Fail-open:
 * always exits 0, silent when no endpoint resolves.
 */
import fs from 'node:fs';

import { logHookError, resolveHookRepoRoot } from '../../index.ts';
import { runHeartbeat } from './heartbeat-run.ts';
import { isShadowedByRepoHooks } from './shadow.ts';

/** The `cwd` a SessionStart payload reports, or null when absent or unparsable. */
const readPayloadCwd = (stdin: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(stdin);
    if (typeof parsed === 'object' && parsed !== null && 'cwd' in parsed) {
      return typeof parsed.cwd === 'string' && parsed.cwd ? parsed.cwd : null;
    }
  } catch {
    // An empty or malformed payload just means no cwd; the heartbeat does not need one.
  }
  return null;
};

/** Whole stdin, or '' when there is none to read. */
const readStdin = (): string => {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

const main = async (): Promise<void> => {
  try {
    const projectDir =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

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
      payloadCwd: readPayloadCwd(readStdin()),
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
