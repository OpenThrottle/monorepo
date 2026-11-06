/**
 * @description The subset of the Agent Trajectory Interchange Format (ATIF) v1.8 that OpenThrottle
 * produces. Field names are the spec's own snake_case, so a stored trajectory is a valid ATIF
 * document that Harbor's viewer and loaders read unchanged. Spec: Harbor RFC 0001
 * (github.com/harbor-framework/harbor/blob/main/rfcs/0001-trajectory-format.md). The pinned version
 * and why it was chosen: docs/openthrottle/eval-system-adr.md § Decision 3. Optional fields mirror
 * the spec's own optionality, which is why they are `?:` here rather than `| undefined`.
 */

/**
 * @description One tool or function invocation inside an agent step.
 * @public
 */
export interface AtifToolCall {
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly function_name: string;
  readonly tool_call_id: string;
}

/**
 * @description One result an agent step observed, correlated to its call by `source_call_id`.
 * @public
 */
export interface AtifObservationResult {
  readonly content: string;
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly source_call_id?: string;
}

/**
 * @description The environment feedback attached to a step.
 * @public
 */
export interface AtifObservation {
  readonly results: readonly AtifObservationResult[];
}

/**
 * @description Per-step LLM metrics. `prompt_tokens` INCLUDES `cached_tokens`.
 * @public
 */
export interface AtifMetrics {
  readonly cached_tokens?: number;
  readonly completion_tokens?: number;
  readonly cost_usd?: number;
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly prompt_tokens?: number;
}

/**
 * @description Who produced a step.
 * @public
 */
export type AtifStepSource = 'agent' | 'system' | 'user';

/**
 * @description One interaction turn.
 * @public
 */
export interface AtifStep {
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly message: string;
  readonly metrics?: AtifMetrics;
  readonly model_name?: string;
  readonly observation?: AtifObservation;
  readonly reasoning_content?: string;
  readonly source: AtifStepSource;
  readonly step_id: number;
  readonly timestamp?: string;
  readonly tool_calls?: readonly AtifToolCall[];
}

/**
 * @description The agent system that produced the trajectory.
 * @public
 */
export interface AtifAgent {
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly model_name?: string;
  readonly name: string;
  readonly version: string;
}

/**
 * @description Aggregate metrics for the whole trajectory. `total_prompt_tokens` INCLUDES
 * `total_cached_tokens`.
 * @public
 */
export interface AtifFinalMetrics {
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly total_cached_tokens?: number;
  readonly total_completion_tokens?: number;
  readonly total_cost_usd?: number;
  readonly total_prompt_tokens?: number;
  readonly total_steps?: number;
}

/**
 * @description A complete ATIF document.
 * @public
 */
export interface AtifTrajectory {
  readonly agent: AtifAgent;
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly final_metrics?: AtifFinalMetrics;
  readonly notes?: string;
  readonly schema_version: string;
  readonly session_id?: string;
  readonly steps: readonly AtifStep[];
}
