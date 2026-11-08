/**
 * A plan-run recording scenario: a plan whose tasks the REAL Ralph orchestrator
 * works through, one agent spawn per iteration. Ids are placeholder UUIDs from
 * the start, so the sanitizer leaves them alone and the replayed orchestrator
 * builds a byte-identical prompt.
 *
 * @public
 */
export interface PlanRunScenario {
  readonly description: string;
  /** Orchestrator iteration budget. */
  readonly iterations: number;
  /** The operator prompt (`context.prompt`) the orchestrator leads with. */
  readonly prompt: string;
  readonly slug: string;
  readonly tasks: readonly PlanRunScenarioTask[];
}

/** @public */
export interface PlanRunScenarioTask {
  readonly description: string;
  readonly title: string;
}
