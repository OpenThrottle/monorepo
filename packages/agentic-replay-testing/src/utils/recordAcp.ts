/**
 * Recording through the production ACP backend. `recordAcpScenario` builds
 * `createAcpConversationBackend(ACP_AGENT_SPECS[id])` fresh for each
 * transcript, points the spec's `*_BIN` at the ACP recording shim, drives the
 * scenario's turns through `driveScenarioTurn` (the same inputs the CLI
 * recordings use) and waits for the pool to dispose the agent process, because
 * the backend has no close API: the shim writes its exit line only when the
 * process dies.
 *
 * One transcript is one agent process lifetime:
 * - `<slug>` records every turn in one warm process;
 * - `<slug>.turn-N` (N >= 2) records turns 1..N-1 on one process, waits for
 *   the idle dispose, then records turn N on a fresh process, which resumes
 *   through `session/load`. Only that last process is written.
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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ConversationStreamChunk } from '@openthrottle/agentic-conversation-backend';
import {
  ACP_AGENT_SPECS,
  ACP_IDLE_TTL_MS_ENV,
  createAcpConversationBackend,
} from '@openthrottle/agentic-conversation-backend';
import { sleep } from '@openthrottle/nodejs-utils';

import type { RecordingProfile } from '../config/config.backends.ts';
import { SESSION_STRATEGIES } from '../config/config.backends.ts';
import type { Scenario } from '../types/scenario.ts';
import {
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_PROTOCOLS,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../types/transcript.ts';
import { acpRedactKeys } from './acp-normalize.ts';
import { answerPermissions } from './answerPermissions.ts';
import { buildAcpFixtureText } from './buildAcpFixtureText.ts';
import type { ConversationState } from './drive-turn.ts';
import {
  advanceConversation,
  driveScenarioTurn,
  initialConversation,
} from './drive-turn.ts';
import { withBinEnv, writeNodeBin } from './stub-bin.ts';

const ACP_SHIM_PATH = fileURLToPath(
  new URL('runAcpRecordingShim.ts', import.meta.url),
);

/** Short enough that a recording does not idle long, long enough for a turn gap. */
const ACP_RECORDING_IDLE_TTL_MS = 1500;

/** How long to wait for the pool to dispose the agent after the last turn. */
const EXIT_WAIT_MS = 30_000;

const EXIT_POLL_MS = 100;

const TURN_STEM = /^(?<slug>.+)\.turn-(?<turn>\d+)$/;

/** @public */
export interface RecordAcpScenarioOptions {
  /** Model to record with; overridden by a scenario that pins its own. */
  readonly model: string | null;
  /**
   * Sees every chunk; answers a supervised turn's permission requests.
   * Undefined refuses them, as a headless run does.
   */
  readonly onChunk: ((chunk: ConversationStreamChunk) => void) | undefined;
  /** Directory transcripts are written into, e.g. `fixtures/cursor/acp`. */
  readonly outDir: string;
  readonly profile: RecordingProfile;
  /** Absolute path of the real agent binary. */
  readonly realBin: string;
  readonly scenario: Scenario;
  /**
   * Stems to record, from {@link acpTranscriptStems}; undefined records all of
   * them.
   */
  readonly stems: readonly string[] | undefined;
}

/** @public */
export type RecordAcpScenarioResult =
  | { readonly error: string; readonly ok: false }
  | { readonly files: readonly string[]; readonly ok: true };

/**
 * Every ACP transcript stem a scenario records: the bare slug (all turns, one
 * warm process) plus `<slug>.turn-N` for each turn N >= 2 of a multi-turn
 * scenario.
 *
 * @public
 */
export function acpTranscriptStems(scenario: Scenario): string[] {
  const resumed = scenario.turns.slice(1).map((_turn, index) => {
    return `${scenario.slug}.turn-${index + 2}`;
  });
  return [scenario.slug, ...resumed];
}

/** The 0-based index of the turn a stem ends on, or null for a bad stem. */
function lastTurnIndex(scenario: Scenario, stem: string): number | null {
  if (stem === scenario.slug) {
    return scenario.turns.length - 1;
  }
  const match = TURN_STEM.exec(stem);
  if (match?.groups?.slug !== scenario.slug) {
    return null;
  }
  const turn = Number(match.groups.turn);
  return turn >= 2 && turn <= scenario.turns.length ? turn - 1 : null;
}

/** True once the shim has appended its exit line, i.e. the agent is gone. */
function hasExited(capturePath: string): boolean {
  if (!existsSync(capturePath)) {
    return false;
  }
  const last = readFileSync(capturePath, 'utf8').trimEnd().split('\n').at(-1);
  return last?.includes(`"type":"${TRANSCRIPT_LINE_TYPES.exit}"`) === true;
}

async function waitForExit(capturePath: string): Promise<boolean> {
  const deadline = Date.now() + EXIT_WAIT_MS;
  while (Date.now() < deadline) {
    if (hasExited(capturePath)) {
      return true;
    }
    // Polling for the idle dispose is sequential by nature.
    // eslint-disable-next-line no-await-in-loop -- the capture only grows; wait for the exit line
    await sleep(EXIT_POLL_MS);
  }
  return hasExited(capturePath);
}

type StemResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly text: string };

interface StemContext extends RecordAcpScenarioOptions {
  readonly cliVersion: string;
}

/** Record one stem in its own cwd, backend and shim dir. */
async function recordStem(
  options: StemContext,
  stem: string,
  lastTurn: number,
): Promise<StemResult> {
  const { profile, scenario } = options;
  const spec = ACP_AGENT_SPECS[profile.backend];
  if (spec === undefined) {
    return { error: `no ACP spec for ${profile.backend}`, ok: false };
  }
  const cwd = mkdtempSync(join(tmpdir(), 'ot-replay-cwd-'));
  const shimDir = mkdtempSync(join(tmpdir(), 'ot-replay-shim-'));
  const model = scenario.model ?? options.model;
  // Session ids come from the agent (`session/new`), never pre-minted.
  const acpProfile = {
    ...profile,
    conversationBackend: createAcpConversationBackend(spec),
    sessionStrategy: SESSION_STRATEGIES.cli,
  };
  // A resumed transcript ends on a fresh process, so an earlier one is its own phase.
  const isResumed = lastTurn > 0 && stem !== scenario.slug;
  const phases = [{ first: 0, last: isResumed ? lastTurn - 1 : lastTurn }];
  if (isResumed) {
    phases.push({ first: lastTurn, last: lastTurn });
  }
  let conversation: ConversationState = initialConversation(undefined);
  let capturePath = '';

  try {
    for (const [name, content] of Object.entries(scenario.seedFiles)) {
      mkdirSync(dirname(join(cwd, name)), { recursive: true });
      writeFileSync(join(cwd, name), content, 'utf8');
    }

    for (const [phaseIndex, phase] of phases.entries()) {
      capturePath = join(shimDir, `${stem}.${phaseIndex}.capture.ndjson`);
      const bin = writeNodeBin({
        dir: shimDir,
        entry: 'runAcpRecordingShim',
        modulePath: ACP_SHIM_PATH,
        name: `${stem}.${phaseIndex}`,
        options: {
          capturePath,
          realBin: options.realBin,
          // `mcpServers` is handled by the normalizer (names kept).
          redactKeys: acpRedactKeys(profile.redactKeys),
        },
      });

      // eslint-disable-next-line no-await-in-loop -- the next phase resumes this phase's session
      const exited = await withBinEnv(
        ACP_IDLE_TTL_MS_ENV,
        String(ACP_RECORDING_IDLE_TTL_MS),
        async () => {
          return withBinEnv(spec.binEnv, bin, async () => {
            for (let index = phase.first; index <= phase.last; index += 1) {
              const turn = scenario.turns[index];
              if (turn === undefined) {
                continue;
              }
              const current = conversation;
              // Turns are sequential: a resume turn needs the previous session.
              // eslint-disable-next-line no-await-in-loop -- a resume turn needs the previous turn's session and reply
              const chunks = await driveScenarioTurn(acpProfile, {
                conversation: current,
                cwd,
                model,
                onChunk: options.onChunk ?? answerPermissions(null),
                resolved: { scenario, turn, turnIndex: index },
              });
              conversation = advanceConversation(
                acpProfile,
                current,
                turn,
                chunks,
              );
            }
            return waitForExit(capturePath);
          });
        },
      );
      if (!existsSync(capturePath)) {
        return { error: `${stem}: the agent was never spawned`, ok: false };
      }
      if (!exited) {
        return {
          error: `${stem}: the agent did not exit after the idle TTL`,
          ok: false,
        };
      }
    }

    const present = scenario.expectAbsentFiles.filter((name) => {
      return existsSync(join(cwd, name));
    });
    if (present.length > 0) {
      return {
        error: `${stem}: a denied write happened (${present.join(', ')})`,
        ok: false,
      };
    }

    const fixture = buildAcpFixtureText(
      readFileSync(capturePath, 'utf8'),
      {
        backend: profile.backend,
        cliVersion: options.cliVersion,
        model,
        protocol: TRANSCRIPT_PROTOCOLS.acp,
        recordedAt: new Date().toISOString(),
        scenario: stem,
        schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
        surface: TRANSCRIPT_SURFACES.conversation,
        type: TRANSCRIPT_LINE_TYPES.header,
      },
      cwd,
    );
    return fixture.ok
      ? fixture
      : { error: `${stem}: ${fixture.error}`, ok: false };
  } finally {
    rmSync(cwd, { force: true, recursive: true });
    rmSync(shimDir, { force: true, recursive: true });
  }
}

/**
 * Record a scenario's ACP transcripts and write them to `outDir`. Nothing is
 * written unless every requested stem recorded cleanly.
 *
 * @public
 */
export async function recordAcpScenario(
  options: RecordAcpScenarioOptions,
): Promise<RecordAcpScenarioResult> {
  const { profile, scenario } = options;
  if (ACP_AGENT_SPECS[profile.backend] === undefined) {
    const known = Object.keys(ACP_AGENT_SPECS).join(', ');
    return {
      error: `${profile.backend} has no ACP spec (ACP backends: ${known})`,
      ok: false,
    };
  }

  const stems = options.stems ?? acpTranscriptStems(scenario);
  const lastTurns = stems.map((stem) => lastTurnIndex(scenario, stem));
  const badStem = stems.find((_stem, index) => lastTurns[index] === null);
  if (badStem !== undefined) {
    return {
      error: `${badStem} is not an ACP stem of ${scenario.slug}`,
      ok: false,
    };
  }

  const cliVersion = execFileSync(options.realBin, [...profile.versionArgs], {
    encoding: 'utf8',
  }).trim();
  const pending: Array<{ readonly file: string; readonly text: string }> = [];

  for (const [index, stem] of stems.entries()) {
    const lastTurn = lastTurns[index] ?? 0;
    // Recordings share the agent's login and rate limit: one at a time.
    // eslint-disable-next-line no-await-in-loop -- recordings share the agent's login and rate limit
    const result = await recordStem({ ...options, cliVersion }, stem, lastTurn);
    if (!result.ok) {
      return result;
    }
    pending.push({
      file: join(options.outDir, `${stem}.ndjson`),
      text: result.text,
    });
  }

  mkdirSync(options.outDir, { recursive: true });
  for (const { file, text } of pending) {
    writeFileSync(file, text, 'utf8');
  }
  return { files: pending.map(({ file }) => file), ok: true };
}
