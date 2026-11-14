/**
 * Telemetry doctor: diagnoses why skill-usage telemetry is not arriving and prints the exact fix
 * for each problem. Operator-run, registered as no hook; ships in the plugin payload so it can be
 * run from any directory, even when the plugin is the thing that is missing.
 *
 * Usage: node .claude/hooks/skill-usage-doctor.cjs [--json] [--strict] [--fix]
 *
 * Read-only unless `--fix`, which offers to run the `claude plugin …` commands that install or
 * update the plugin — shown first, run only on an interactive yes, refused without a TTY and
 * ignored with `--json` (see `doctor-fix-run.ts`).
 *
 * Exit code is 0, unless `--strict` and any check FAILs, or `--fix` was refused for want of a TTY
 * or a command it ran failed. Output never contains the token, an email, the hostname or the
 * absolute home path (the `claude` CLI's own output during `--fix` is its own).
 */
import fs from 'node:fs';
import os from 'node:os';

import { resolveAuthToken } from '../../config/env.ts';
import { logHookError, resolveHookRepoRoot } from '../../index.ts';
import { CHECK_STATUS } from './doctor-checks.ts';
import {
  createTerminalFixIo,
  PLUGIN_FIX_OUTCOME,
  resolveClaudeBinary,
  resolvePluginFixPlan,
  runPluginFix,
} from './doctor-fix-run.ts';
import {
  renderDoctorHuman,
  renderDoctorJson,
  type Scrubber,
  scrubText,
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

/** Exit status of `--fix`: non-zero only when it was refused or a command failed. */
const runFix = async (
  scriptPath: string,
  scrubber: Scrubber,
): Promise<number> => {
  const terminal = createTerminalFixIo();
  const outcome = await runPluginFix({
    binary: resolveClaudeBinary(process.env),
    io: {
      ...terminal,
      write: (text) => {
        terminal.write(scrubText(text, scrubber));
      },
    },
    plan: resolvePluginFixPlan({
      env: process.env,
      homeDir: os.homedir(),
      scriptPath,
    }),
  });
  const failed =
    outcome === PLUGIN_FIX_OUTCOME.NO_TTY ||
    outcome === PLUGIN_FIX_OUTCOME.FAILED;
  return failed ? 1 : 0;
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
    const scriptPath = process.argv[1] ?? '';
    const checks = await collectChecks({ repoRoot, scriptPath });
    const scrubber = buildScrubber(repoRoot);
    process.stdout.write(
      args.json
        ? renderDoctorJson(checks, scrubber)
        : renderDoctorHuman(checks, scrubber),
    );
    const hasFail = checks.some((check) => check.status === CHECK_STATUS.FAIL);
    const checksCode = args.strict && hasFail ? 1 : 0;
    if (!args.fix) {
      return checksCode;
    }
    if (args.json) {
      process.stderr.write('--fix is ignored with --json; nothing was run.\n');
      return checksCode;
    }
    return Math.max(checksCode, await runFix(scriptPath, scrubber));
  } catch (err) {
    logHookError('doctor failed', err);
    return 0;
  }
};

main().then((code) => {
  process.exit(code);
});
