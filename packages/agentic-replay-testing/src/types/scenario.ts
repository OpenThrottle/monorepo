import type {
  ConversationPermissionMode,
  ConversationReasoningEffort,
} from '@openthrottle/openthrottle-agentic-utils';

/**
 * One spawn of the CLI within a scenario. Turns after the first resume the
 * first turn's session.
 *
 * @public
 */
export interface ScenarioTurn {
  /** Abort the run as soon as the first text chunk arrives. */
  readonly abortAfterFirstChunk: boolean;
  readonly permissionMode: ConversationPermissionMode | undefined;
  readonly prompt: string;
  readonly reasoning: ConversationReasoningEffort | undefined;
  readonly systemPrompt: string | undefined;
}

/**
 * A backend-neutral recording scenario. Every backend records the same set, so
 * a transcript directory can be compared across CLIs.
 *
 * @public
 */
export interface Scenario {
  readonly description: string;
  /**
   * Files that must NOT exist in the scenario's cwd after recording — proof
   * that a denied write never happened. The recorder fails if one does.
   */
  readonly expectAbsentFiles: readonly string[];
  /** Overrides the recording model, e.g. an invalid id for the error scenario. */
  readonly model: string | undefined;
  /** Files written into the scenario's cwd before the first turn. */
  readonly seedFiles: Readonly<Record<string, string>>;
  readonly slug: string;
  readonly turns: readonly ScenarioTurn[];
}
