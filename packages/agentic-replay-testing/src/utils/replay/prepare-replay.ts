/**
 * Everything a replay test needs before it calls production code: the replay
 * bin installed for a transcript, a cwd seeded the way the recording's was,
 * and the backend run its scenario turn describes. A test that drives a
 * backend directly uses {@link replayFixture}; one that drives a higher seam
 * (the server's conversation-stream service) maps `run` onto that seam's input
 * and installs `bin` itself.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { ConversationBackendRun } from '@openthrottle/openthrottle-agentic-utils';

import {
  SESSION_STRATEGIES,
  type SessionStrategy,
} from '../../config/config.backends.ts';
import type { Transcript } from '../../types/transcript.ts';
import { placeholderUuid } from '../sanitizer/sanitizer.ts';
import type { ConversationState } from '../scenario/drive-turn.ts';
import {
  type ResolvedScenarioTurn,
  resolveScenarioTurn,
  scenarioRun,
} from '../scenario/scenario-run.ts';
import { installReplayBin } from './installReplayBin.ts';
import type { ReplayReport } from './replay-bin.ts';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', '..', 'fixtures');

/** @public */
export interface PreparedReplay {
  /** Absolute path to set as the backend's `*_BIN`. */
  readonly bin: string;
  /** The abort controller wired into {@link run}'s signal. */
  readonly controller: AbortController;
  readonly cwd: string;
  /** Remove the bin and the seeded cwd. */
  readonly dispose: () => void;
  /** The replay bin's verdict on the last run; null = never spawned. */
  readonly readReport: () => ReplayReport | null;
  readonly resolved: ResolvedScenarioTurn;
  /** The backend run the recording was made with, on this machine. */
  readonly run: ConversationBackendRun;
  readonly transcript: Transcript;
}

/**
 * The session id a replay's first turn uses: the placeholder a caller-minted
 * id was sanitized to, or none when the CLI mints its own.
 *
 * @public
 */
export function replaySessionStart(
  strategy: SessionStrategy,
): string | undefined {
  return strategy === SESSION_STRATEGIES.caller
    ? placeholderUuid(1)
    : undefined;
}

/**
 * Absolute path of a committed transcript.
 *
 * @public
 */
export function replayFixturePath(backend: string, stem: string): string {
  return join(FIXTURES_DIR, backend, `${stem}.ndjson`);
}

/**
 * Prepare a replay of the transcript at `fixturePath`, continuing
 * `conversation` (the default suits a single-turn replay of a `caller`
 * backend such as claude). Throws when the transcript is unreadable or names
 * no shared scenario — a fixture bug.
 *
 * @public
 */
export function prepareReplay(
  fixturePath: string,
  conversation: ConversationState = {
    history: [],
    sessionId: placeholderUuid(1),
  },
): PreparedReplay {
  const replay = installReplayBin(fixturePath);
  const { header } = replay.transcript;
  const resolved = resolveScenarioTurn(header.scenario);
  if (resolved === null) {
    replay.dispose();
    throw new Error(`${fixturePath}: no scenario "${header.scenario}"`);
  }

  const cwd = mkdtempSync(join(tmpdir(), 'ot-replay-cwd-'));
  for (const [name, content] of Object.entries(resolved.scenario.seedFiles)) {
    mkdirSync(dirname(join(cwd, name)), { recursive: true });
    writeFileSync(join(cwd, name), content, 'utf8');
  }

  const controller = new AbortController();

  return {
    bin: replay.bin,
    controller,
    cwd,
    dispose: () => {
      replay.dispose();
      rmSync(cwd, { force: true, recursive: true });
    },
    readReport: replay.readReport,
    resolved,
    run: scenarioRun(resolved, {
      cwd,
      history: conversation.history,
      model: header.model,
      sessionId: conversation.sessionId,
      signal: controller.signal,
    }),
    transcript: replay.transcript,
  };
}
