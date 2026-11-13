/**
 * Replaying committed transcripts through production code.
 *
 * `replayFixture` replays one transcript through a production conversation
 * backend and collects what it streams. A later turn of a multi-turn scenario
 * first replays every earlier turn, each strictly verified, to rebuild the
 * history and session id its recording continued.
 *
 * `replayPlanRun` replays a plan-run transcript through the REAL Ralph
 * orchestrator: the CLI's bare command name resolves to the replay bin on PATH,
 * and the orchestrator, drivers engine and structured-output renderer run
 * unchanged.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { ConversationStreamChunk } from '@openthrottle/openthrottle-agentic-utils';
import { getDriver, isDriverId } from '@openthrottle/openthrottle-drivers';

import type { ReplayProfile } from '../../config/config.backends.ts';
import { PLAN_RUN_SCENARIOS } from '../../data/data.plan-run-scenarios.ts';
import type { Transcript } from '../../types/transcript.ts';
import {
  withBinEnv,
  withPathPrepended,
  writePathAlias,
} from '../bin/stub-bin.ts';
import {
  runPlanRunScenario,
  type RunPlanRunScenarioResult,
} from '../plan-run/runPlanRunScenario.ts';
import {
  advanceConversation,
  type ConversationState,
  driveScenarioTurn,
  initialConversation,
} from '../scenario/drive-turn.ts';
import {
  type ResolvedScenarioTurn,
  transcriptStem,
} from '../scenario/scenarioRun.ts';
import { installReplayBin } from './installReplayBin.ts';
import { prepareReplay, replaySessionStart } from './prepareReplay.ts';
import type { ReplayReport } from './replay-bin.ts';

/** @public */
export interface ReplayFixtureOptions {
  /** Absolute path of the transcript, e.g. from `replayFixturePath`. */
  readonly fixturePath: string;
  readonly profile: ReplayProfile;
}

/** @public */
export interface ReplayFixtureResult {
  readonly chunks: readonly ConversationStreamChunk[];
  /** The replay bin's own verdict on the outbound traffic; null = never ran. */
  readonly report: ReplayReport | null;
  readonly transcript: Transcript;
}

async function replayTurn(
  profile: ReplayProfile,
  fixturePath: string,
  conversation: ConversationState,
): Promise<ReplayFixtureResult & { readonly resolved: ResolvedScenarioTurn }> {
  const prepared = prepareReplay(fixturePath, conversation);

  try {
    const chunks = await withBinEnv(profile.binEnv, prepared.bin, async () => {
      return driveScenarioTurn(profile, {
        conversation,
        cwd: prepared.cwd,
        model: prepared.transcript.header.model,
        resolved: prepared.resolved,
      });
    });

    return {
      chunks,
      report: prepared.readReport(),
      resolved: prepared.resolved,
      transcript: prepared.transcript,
    };
  } finally {
    prepared.dispose();
  }
}

/**
 * Replay a transcript and return the backend's chunks plus the bin's report.
 * Throws when an earlier turn it depends on does not replay cleanly.
 *
 * @public
 */
export async function replayFixture(
  options: ReplayFixtureOptions,
): Promise<ReplayFixtureResult> {
  const { fixturePath, profile } = options;
  const target = prepareReplay(fixturePath);
  const { scenario, turnIndex } = target.resolved;
  target.dispose();

  let conversation = initialConversation(
    replaySessionStart(profile.sessionStrategy),
  );

  for (let index = 0; index < turnIndex; index += 1) {
    const priorPath = join(
      dirname(fixturePath),
      `${transcriptStem(scenario, index)}.ndjson`,
    );
    // Earlier turns replay strictly in order: each feeds the next its history.
    // eslint-disable-next-line no-await-in-loop -- each prior turn feeds the next its history
    const prior = await replayTurn(profile, priorPath, conversation);
    if (prior.report?.ok !== true) {
      throw new Error(
        `${priorPath} (an earlier turn) did not replay: ${JSON.stringify(prior.report)}`,
      );
    }
    conversation = advanceConversation(
      profile,
      conversation,
      prior.resolved.turn,
      prior.chunks,
    );
  }

  const result = await replayTurn(profile, fixturePath, conversation);
  return {
    chunks: result.chunks,
    report: result.report,
    transcript: result.transcript,
  };
}

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
