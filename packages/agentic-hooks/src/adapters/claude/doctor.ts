/**
 * Telemetry doctor: diagnoses why skill-usage telemetry is not arriving and prints the exact fix
 * for each problem. Operator-run, registered as no hook; ships in the plugin payload so it can be
 * run from any directory, even when the plugin is the thing that is missing.
 *
 * Usage: node .claude/hooks/skill-usage-doctor.cjs [--json] [--strict]
 *
 * Exit code is 0 always, unless `--strict` and any check FAILs. Output never contains the token,
 * an email, the hostname or the absolute home path.
 */
import fs from 'node:fs';
import os from 'node:os';

import { resolveAuthToken } from '../../config/env.ts';
import { logHookError, resolveHookRepoRoot } from '../../index.ts';
import { CHECK_STATUS } from './doctor-checks.ts';
import {
  renderDoctorHuman,
  renderDoctorJson,
  type Scrubber,
} from './doctor-render.ts';
import { collectChecks } from './doctor-run.ts';
import { parseDoctorArgs } from './parseDoctorArgs.ts';

const realpathOrNull = (target: string): string | null => {
  try {
    return fs.realpathSync(target);
  } catch {
    return null;
  }
};

const buildScrubber = (repoRoot: string): Scrubber => {
  const home = os.homedir();
  const homeDirs = [home, realpathOrNull(home)].filter(
    (dir): dir is string => dir !== null,
  );
  return {
    homeDirs,
    hostname: os.hostname(),
    token: resolveAuthToken(repoRoot) || null,
  };
};

const main = async (): Promise<number> => {
  try {
    const args = parseDoctorArgs(process.argv.slice(2));
    const repoRoot = resolveHookRepoRoot({
      payloadCwd: null,
      projectDir:
        process.env.CLAUDE_PROJECT_DIR ||
        process.env.OPEN_THROTTLE_REPO_ROOT ||
        process.cwd(),
    });
    const checks = await collectChecks({
      repoRoot,
      scriptPath: process.argv[1] ?? '',
    });
    const scrubber = buildScrubber(repoRoot);
    process.stdout.write(
      args.json
        ? renderDoctorJson(checks, scrubber)
        : renderDoctorHuman(checks, scrubber),
    );
    const hasFail = checks.some((check) => check.status === CHECK_STATUS.FAIL);
    return args.strict && hasFail ? 1 : 0;
  } catch (err) {
    logHookError('doctor failed', err);
    return 0;
  }
};

main().then((code) => {
  process.exit(code);
});
