/**
 * Replay one committed transcript through a production conversation backend
 * and collect what it streams. A later turn of a multi-turn scenario first
 * replays every earlier turn — each strictly verified — to rebuild the history
 * and session id its recording continued.
 */

import { dirname, join } from 'node:path';

import type { ConversationStreamChunk } from '@openthrottle/openthrottle-agentic-utils';

import type { ReplayProfile } from '../../config/config.backends.ts';
import type { Transcript } from '../../types/transcript.ts';
import { withBinEnv } from '../bin/stub-bin.ts';
import {
  advanceConversation,
  type ConversationState,
  driveScenarioTurn,
  initialConversation,
} from '../scenario/drive-turn.ts';
import {
  type ResolvedScenarioTurn,
  transcriptStem,
} from '../scenario/scenario-run.ts';
import { prepareReplay, replaySessionStart } from './prepare-replay.ts';
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
