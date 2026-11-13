/**
 * Turn a scenario turn into the {@link ConversationBackendRun} a production
 * backend receives. The recorder and every replay build runs here, so a replay
 * sends the backend exactly the inputs the recording did — and any difference
 * in the argv it then builds is a real change, not harness drift.
 */

import type { ConversationBackendRun } from '@openthrottle/openthrottle-agentic-utils';

import { SCENARIOS } from '../../data/data.scenarios.ts';
import type { Scenario, ScenarioTurn } from '../../types/scenario.ts';

/**
 * One prior message of the conversation, as the backend receives it.
 *
 * @public
 */
export type ScenarioMessage = ConversationBackendRun['messages'][number];

/** @public */
export interface ScenarioRunContext {
  readonly cwd: string;
  /**
   * Every earlier turn's user prompt and assistant reply, oldest first. Some
   * backends replay it into the prompt; the rest send only the latest
   * message, so for them it changes nothing.
   */
  readonly history: readonly ScenarioMessage[];
  /** Model id, or null for the account default (no `--model` flag). */
  readonly model: string | null;
  /** Session to create or resume; undefined lets the CLI mint one. */
  readonly sessionId: string | undefined;
  readonly signal: AbortSignal | undefined;
}

/** @public */
export interface ResolvedScenarioTurn {
  readonly scenario: Scenario;
  readonly turn: ScenarioTurn;
  readonly turnIndex: number;
}

const TURN_STEM = /^(?<slug>.+)\.turn-(?<turn>\d+)$/;

/**
 * File stem for one turn: the slug for single-turn scenarios, `<slug>.turn-<n>`
 * otherwise.
 *
 * @public
 */
export function transcriptStem(scenario: Scenario, turnIndex: number): string {
  if (scenario.turns.length === 1) {
    return scenario.slug;
  }
  return `${scenario.slug}.turn-${turnIndex + 1}`;
}

/**
 * Find the scenario turn a transcript stem (a header's `scenario`) names, or
 * null when no shared scenario matches.
 *
 * @public
 */
export function resolveScenarioTurn(stem: string): ResolvedScenarioTurn | null {
  const match = TURN_STEM.exec(stem);
  const slug = match?.groups?.slug ?? stem;
  const turnIndex =
    match?.groups?.turn === undefined ? 0 : Number(match.groups.turn) - 1;
  const scenario = SCENARIOS.find((candidate) => candidate.slug === slug);
  const turn = scenario?.turns[turnIndex];

  if (scenario === undefined || turn === undefined) {
    return null;
  }
  return { scenario, turn, turnIndex };
}

/**
 * The backend run for one scenario turn.
 *
 * @public
 */
export function scenarioRun(
  resolved: ResolvedScenarioTurn,
  context: ScenarioRunContext,
): ConversationBackendRun {
  const { turn, turnIndex } = resolved;

  return {
    cwd: context.cwd,
    messages: [...context.history, { content: turn.prompt, role: 'user' }],
    model: context.model ?? '',
    permissionMode: turn.permissionMode,
    reasoning: turn.reasoning,
    resumeSession: turnIndex > 0,
    sessionId: context.sessionId,
    signal: context.signal,
    systemPrompt: turn.systemPrompt,
  };
}
