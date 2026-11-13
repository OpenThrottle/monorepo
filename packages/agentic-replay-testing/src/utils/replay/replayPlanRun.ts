/**
 * Replay a plan-run transcript through the REAL Ralph orchestrator: the CLI's
 * bare command name resolves to the replay bin on PATH, and the orchestrator,
 * drivers engine and structured-output renderer run unchanged.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { getDriver, isDriverId } from '@openthrottle/openthrottle-drivers';

import { PLAN_RUN_SCENARIOS } from '../../data/data.plan-run-scenarios.ts';
import type { Transcript } from '../../types/transcript.ts';
import { withPathPrepended, writePathAlias } from '../bin/path-bin.ts';
import {
  runPlanRunScenario,
  type RunPlanRunScenarioResult,
} from '../plan-run/runPlanRunScenario.ts';
import { installReplayBin } from './installReplayBin.ts';
import type { ReplayReport } from './replay-bin.ts';

/** @public */
export interface ReplayPlanRunResult extends RunPlanRunScenarioResult {
  /** The replay bin's verdict; null = the agent was never spawned. */
  readonly report: ReplayReport | null;
  readonly transcript: Transcript;
}

/**
 * Replay the plan-run transcript at `fixturePath`. Throws when the transcript
 * names no plan-run scenario or no known driver — a fixture bug.
 *
 * @public
 */
export async function replayPlanRun(
  fixturePath: string,
): Promise<ReplayPlanRunResult> {
  const replay = installReplayBin(fixturePath);
  const { header } = replay.transcript;
  const runner = header.backend;
  const scenario = PLAN_RUN_SCENARIOS.find(
    (candidate) => candidate.slug === header.scenario,
  );
  const cwd = mkdtempSync(join(tmpdir(), 'ot-replay-cwd-'));

  try {
    if (scenario === undefined || !isDriverId(runner)) {
      throw new Error(
        `${fixturePath}: no plan-run scenario "${header.scenario}"`,
      );
    }
    const binDir = dirname(replay.bin);
    writePathAlias(binDir, getDriver(runner).binary, replay.bin);

    const result = await withPathPrepended(binDir, async () => {
      return runPlanRunScenario({
        cwd,
        model: header.model ?? 'auto',
        runner,
        scenario,
      });
    });

    return {
      ...result,
      report: replay.readReport(),
      transcript: replay.transcript,
    };
  } finally {
    replay.dispose();
    rmSync(cwd, { force: true, recursive: true });
  }
}
