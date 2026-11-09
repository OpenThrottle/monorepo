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
  /**
   * A failure no real account reproduces on demand (an org out of credit) is
   * recorded against a stand-in CLI instead — `scripts/synthetic/<bin>.ts` —
   * and only for that one backend. The drift check skips it: there is no real
   * CLI output to drift from. `null` = recorded against the real CLI.
   */
  readonly synthetic: PlanRunScenarioSynthetic | null;
  readonly tasks: readonly PlanRunScenarioTask[];
}

/** @public */
export interface PlanRunScenarioSynthetic {
  /** The one backend whose output the stand-in mimics. */
  readonly backend: string;
  /** Base name of the stand-in module under `scripts/synthetic/`. */
  readonly bin: string;
}

/** @public */
export interface PlanRunScenarioTask {
  readonly description: string;
  readonly title: string;
}
