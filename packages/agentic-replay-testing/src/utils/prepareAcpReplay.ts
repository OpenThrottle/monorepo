/**
 * Everything an ACP replay test needs before it calls production code: the
 * replay bin installed for a transcript, a cwd seeded the way the recording's
 * was, and the turns the transcript covers. `replayAcpFixture` then drives
 * those turns through a fresh production ACP backend.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { ConversationStreamChunk } from '@openthrottle/agentic-conversation-backend';
import {
  ACP_AGENT_SPECS,
  ACP_IDLE_TTL_MS_ENV,
  createAcpConversationBackend,
} from '@openthrottle/agentic-conversation-backend';
import { isRecord } from '@openthrottle/nodejs-utils';

import { SESSION_STRATEGIES } from '../config/config.backends.ts';
import type { AcpTranscript } from '../types/transcript.ts';
import { toLiveUuid } from './acp-replay-bin.ts';
import type { ConversationState } from './drive-turn.ts';
import {
  advanceConversation,
  driveScenarioTurn,
  initialConversation,
} from './drive-turn.ts';
import type { AcpReplayBin } from './installAcpReplayBin.ts';
import { installAcpReplayBin } from './installAcpReplayBin.ts';
import type { ReplayReport } from './replay-bin.ts';
import type { ResolvedScenarioTurn } from './scenarioRun.ts';
import { resolveScenarioTurn } from './scenarioRun.ts';
import { withBinEnv } from './stub-bin.ts';

/** Idle TTL of a replayed backend: the pool disposes the replay this soon. */
const REPLAY_IDLE_TTL_MS = 200;

/** How long to wait for the pool's idle dispose to end the replay process. */
const EXIT_WAIT_MS = 15_000;

const TURN_STEM = /^.+\.turn-\d+$/;

/** @public */
export interface PreparedAcpReplay {
  /** Absolute path to set as the spec's `binEnv`. */
  readonly bin: string;
  /** The conversation state the first of {@link turns} starts from. */
  readonly conversation: ConversationState;
  readonly cwd: string;
  /** Remove the bin and the seeded cwd. */
  readonly dispose: () => void;
  readonly readReport: () => ReplayReport | null;
  readonly transcript: AcpTranscript;
  /**
   * The turns the transcript covers, in order: every turn of the scenario for
   * a bare stem (one warm process), only turn N for `<slug>.turn-N`.
   */
  readonly turns: readonly ResolvedScenarioTurn[];
  readonly waitForExit: (timeoutMs: number) => Promise<boolean>;
}

/**
 * The state `<slug>.turn-N` starts from: turns 1..N-1 as history (their
 * replies are in another transcript, so empty here; a resumed session never
 * reads history) and the session id the recording's `session/load` named.
 */
function resumedConversation(
  transcript: AcpTranscript,
  resolved: ResolvedScenarioTurn,
): ConversationState {
  const load = transcript.frames.find((frame) => {
    return frame.from === 'client' && frame.message.method === 'session/load';
  });
  const params = load?.message.params;
  const named = isRecord(params) ? params.sessionId : undefined;
  const sessionId = typeof named === 'string' ? toLiveUuid(named) : undefined;
  const history = resolved.scenario.turns
    .slice(0, resolved.turnIndex)
    .flatMap((turn) => {
      return [
        { content: turn.prompt, role: 'user' as const },
        { content: '', role: 'assistant' as const },
      ];
    });

  return { history, sessionId };
}

/**
 * Prepare a replay of the ACP transcript at `fixturePath`. Throws when it is
 * unreadable or names no shared scenario: a fixture bug.
 *
 * @public
 */
export function prepareAcpReplay(fixturePath: string): PreparedAcpReplay {
  const replay: AcpReplayBin = installAcpReplayBin(fixturePath);
  const { transcript } = replay;
  const resolved = resolveScenarioTurn(transcript.header.scenario);
  if (resolved === null) {
    replay.dispose();
    throw new Error(
      `${fixturePath}: no scenario "${transcript.header.scenario}"`,
    );
  }

  const cwd = mkdtempSync(join(tmpdir(), 'ot-replay-cwd-'));
  for (const [name, content] of Object.entries(resolved.scenario.seedFiles)) {
    mkdirSync(dirname(join(cwd, name)), { recursive: true });
    writeFileSync(join(cwd, name), content, 'utf8');
  }

  const isResumed = TURN_STEM.test(transcript.header.scenario);
  const allTurns = resolved.scenario.turns.map((turn, turnIndex) => {
    return { scenario: resolved.scenario, turn, turnIndex };
  });
  const turns = isResumed ? [resolved] : allTurns;
  const conversation = isResumed
    ? resumedConversation(transcript, resolved)
    : initialConversation(undefined);

  return {
    bin: replay.bin,
    conversation,
    cwd,
    dispose: () => {
      replay.dispose();
      rmSync(cwd, { force: true, recursive: true });
    },
    readReport: replay.readReport,
    transcript,
    turns,
    waitForExit: replay.waitForExit,
  };
}

/** @public */
export interface ReplayAcpFixtureOptions {
  /** Absolute path of the ACP transcript, e.g. from `replayFixturePath`. */
  readonly fixturePath: string;
  /** Idle TTL of the replayed backend; undefined = 200ms. */
  readonly idleTtlMs: number | undefined;
  /** Sees every chunk; answers a supervised turn's permission requests. */
  readonly onChunk: ((chunk: ConversationStreamChunk) => void) | undefined;
}

/** @public */
export interface ReplayAcpFixtureResult {
  /** One array of chunks per replayed turn. */
  readonly chunks: ReadonlyArray<readonly ConversationStreamChunk[]>;
  /** True when the replay process exited after the idle dispose. */
  readonly exited: boolean;
  /** The replay bin's verdict; null = never spawned. */
  readonly report: ReplayReport | null;
  readonly transcript: AcpTranscript;
}

/**
 * Replay an ACP transcript through a fresh production
 * `createAcpConversationBackend` and wait for the replay process to end. The
 * report must be `{ ok: true }` for the recording to have replayed in full.
 *
 * @public
 */
export async function replayAcpFixture(
  options: ReplayAcpFixtureOptions,
): Promise<ReplayAcpFixtureResult> {
  const prepared = prepareAcpReplay(options.fixturePath);
  const { backend } = prepared.transcript.header;
  const spec = ACP_AGENT_SPECS[backend];
  if (spec === undefined) {
    prepared.dispose();
    throw new Error(`${options.fixturePath}: no ACP spec for ${backend}`);
  }

  // Session ids come from the agent, as in the recording.
  const profile = {
    backend,
    binEnv: spec.binEnv,
    conversationBackend: createAcpConversationBackend(spec),
    sessionStrategy: SESSION_STRATEGIES.cli,
  };
  const model = prepared.transcript.header.model;
  const ttl = String(options.idleTtlMs ?? REPLAY_IDLE_TTL_MS);

  try {
    return await withBinEnv(ACP_IDLE_TTL_MS_ENV, ttl, async () => {
      return withBinEnv(spec.binEnv, prepared.bin, async () => {
        let conversation = prepared.conversation;
        const chunks: ConversationStreamChunk[][] = [];

        for (const resolved of prepared.turns) {
          const current = conversation;
          // Turns are sequential: the next resumes this one's session.
          // eslint-disable-next-line no-await-in-loop -- a resume turn needs the previous turn's session
          const turnChunks = await driveScenarioTurn(profile, {
            conversation: current,
            cwd: prepared.cwd,
            model,
            onChunk: options.onChunk,
            resolved,
          });
          chunks.push(turnChunks);
          conversation = advanceConversation(
            profile,
            current,
            resolved.turn,
            turnChunks,
          );
        }

        const exited = await prepared.waitForExit(EXIT_WAIT_MS);
        return {
          chunks,
          exited,
          report: prepared.readReport(),
          transcript: prepared.transcript,
        };
      });
    });
  } finally {
    prepared.dispose();
  }
}
