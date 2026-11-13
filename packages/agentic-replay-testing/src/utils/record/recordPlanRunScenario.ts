/**
 * Record one plan-run scenario: run the REAL Ralph orchestrator against the
 * in-memory store, with the CLI's bare command name resolving to the
 * recording shim on PATH. The drivers engine builds and spawns the shell
 * command exactly as a production plan run does.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDriver, isDriverId } from '@openthrottle/openthrottle-drivers';

import type { RecordingProfile } from '../../config/config.backends.ts';
import type { PlanRunScenario } from '../../types/plan-run-scenario.ts';
import {
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../types/transcript.ts';
import {
  withPathPrepended,
  writeNodeBin,
  writePathAlias,
} from '../bin/stub-bin.ts';
import { runPlanRunScenario } from '../plan-run/runPlanRunScenario.ts';
import { replayPaths } from '../replay/replayPaths.ts';
import { createSanitizer } from '../sanitizer/sanitizer.ts';
import { buildFixtureText } from './buildFixtureText.ts';

const RECORDING_SHIM_PATH = fileURLToPath(
  new URL('runRecordingShim.ts', import.meta.url),
);

/** @public */
export interface RecordPlanRunScenarioOptions {
  readonly model: string | null;
  readonly outDir: string;
  readonly profile: RecordingProfile;
  /** Absolute path of the real CLI binary. */
  readonly realBin: string;
  readonly scenario: PlanRunScenario;
}

/** @public */
export type RecordPlanRunScenarioResult =
  | { readonly error: string; readonly ok: false }
  | { readonly file: string; readonly ok: true };

/**
 * Record the scenario's single agent spawn and write its transcript.
 *
 * @public
 */
export async function recordPlanRunScenario(
  options: RecordPlanRunScenarioOptions,
): Promise<RecordPlanRunScenarioResult> {
  const { profile, scenario } = options;
  const runner = profile.backend;
  if (!isDriverId(runner)) {
    return { error: `${runner} is not a driver id`, ok: false };
  }

  const cwd = mkdtempSync(join(tmpdir(), 'ot-replay-cwd-'));
  const shimDir = mkdtempSync(join(tmpdir(), 'ot-replay-shim-'));
  const capturePath = join(shimDir, 'capture.ndjson');
  const cliVersion = execFileSync(options.realBin, [...profile.versionArgs], {
    encoding: 'utf8',
  }).trim();

  try {
    const shim = writeNodeBin({
      dir: shimDir,
      entry: 'runRecordingShim',
      modulePath: RECORDING_SHIM_PATH,
      name: 'recording-shim',
      options: { capturePath, realBin: options.realBin },
    });
    writePathAlias(shimDir, getDriver(runner).binary, shim);

    await withPathPrepended(shimDir, async () => {
      await runPlanRunScenario({
        cwd,
        model: options.model ?? 'auto',
        runner,
        scenario,
      });
    });

    if (!existsSync(capturePath)) {
      return {
        error: `${scenario.slug}: the agent was never spawned`,
        ok: false,
      };
    }

    const sanitizer = createSanitizer({
      paths: replayPaths(cwd),
      redactKeys: profile.redactKeys,
    });
    const fixture = buildFixtureText(
      profile,
      sanitizer,
      readFileSync(capturePath, 'utf8'),
      {
        backend: profile.backend,
        cliVersion,
        model: options.model,
        recordedAt: new Date().toISOString(),
        scenario: scenario.slug,
        schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
        surface: TRANSCRIPT_SURFACES.planRun,
        type: TRANSCRIPT_LINE_TYPES.header,
      },
      cwd,
    );
    if (!fixture.ok) {
      return { error: `${scenario.slug}: ${fixture.error}`, ok: false };
    }

    mkdirSync(options.outDir, { recursive: true });
    const file = join(options.outDir, `${scenario.slug}.ndjson`);
    writeFileSync(file, fixture.text, 'utf8');
    return { file, ok: true };
  } finally {
    rmSync(cwd, { force: true, recursive: true });
    rmSync(shimDir, { force: true, recursive: true });
  }
}
