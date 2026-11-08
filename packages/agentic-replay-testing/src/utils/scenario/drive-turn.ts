/**
 * Drive one scenario turn through a backend and carry the conversation to the
 * next turn. Recorder and replay share this, so turn N of a replay receives
 * the same history and session id its recording did.
 */

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationStreamChunk,
} from '@openthrottle/openthrottle-agentic-utils';

import {
  type ReplayProfile,
  SESSION_STRATEGIES,
} from '../../config/config.backends.ts';
import type { ScenarioTurn } from '../../types/scenario.ts';
import {
  type ResolvedScenarioTurn,
  type ScenarioMessage,
  scenarioRun,
} from './scenario-run.ts';

/**
 * What one turn hands the next.
 *
 * @public
 */
export interface ConversationState {
  readonly history: readonly ScenarioMessage[];
  /** The id the next turn creates or resumes; undefined lets the CLI mint. */
  readonly sessionId: string | undefined;
}

/** @public */
export interface DriveScenarioTurnOptions {
  readonly conversation: ConversationState;
  readonly cwd: string;
  readonly model: string | null;
  readonly resolved: ResolvedScenarioTurn;
}

/**
 * The state before turn one.
 *
 * @public
 */
export function initialConversation(
  sessionId: string | undefined,
): ConversationState {
  return { history: [], sessionId };
}

/**
 * Stream one turn and return its chunks. A turn that interrupted its
 * recording aborts at the same point: the first non-empty text chunk. The
 * caller has already pointed the backend's `*_BIN` at the shim or replay bin.
 *
 * @public
 */
export async function driveScenarioTurn(
  profile: ReplayProfile,
  options: DriveScenarioTurnOptions,
): Promise<ConversationStreamChunk[]> {
  const controller = new AbortController();
  const run = scenarioRun(options.resolved, {
    cwd: options.cwd,
    history: options.conversation.history,
    model: options.model,
    sessionId: options.conversation.sessionId,
    signal: controller.signal,
  });
  const chunks: ConversationStreamChunk[] = [];

  for await (const chunk of profile.conversationBackend.stream(run)) {
    chunks.push(chunk);
    const isText =
      chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.text && chunk.delta !== '';
    if (options.resolved.turn.abortAfterFirstChunk && isText) {
      controller.abort();
    }
  }

  return chunks;
}

function lastSessionId(
  chunks: readonly ConversationStreamChunk[],
): string | undefined {
  let found: string | undefined;
  for (const chunk of chunks) {
    const value = chunk.metadata?.sessionId;
    if (
      chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.session &&
      typeof value === 'string' &&
      value !== ''
    ) {
      found = value;
    }
  }
  return found;
}

/**
 * The state after a turn: its prompt and reply appended to the history, and —
 * for a backend whose CLI mints the session — the id it reported.
 *
 * @public
 */
export function advanceConversation(
  profile: ReplayProfile,
  conversation: ConversationState,
  turn: ScenarioTurn,
  chunks: readonly ConversationStreamChunk[],
): ConversationState {
  const reply = chunks
    .filter((chunk) => chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.text)
    .map((chunk) => chunk.delta)
    .join('');
  const isCliMinted = profile.sessionStrategy === SESSION_STRATEGIES.cli;
  const minted = isCliMinted ? lastSessionId(chunks) : undefined;

  return {
    history: [
      ...conversation.history,
      { content: turn.prompt, role: 'user' },
      { content: reply, role: 'assistant' },
    ],
    sessionId: minted ?? conversation.sessionId,
  };
}
