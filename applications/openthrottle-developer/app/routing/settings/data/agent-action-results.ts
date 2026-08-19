/**
 * @description Response contracts for the `resources.agent-*` action routes.
 *
 * Declared in the domain rather than in the route modules so domain components never
 * import from `~/routes/*` — that direction becomes a library→application cycle if
 * `app/routing` is ever extracted (OT plan 88f747ff task 8ab97f22). Each route module
 * annotates its `action` with the matching type here, so the contract and the
 * implementation cannot drift.
 */

export interface AgentEnabledActionResult {
  readonly backend: string;
  readonly enabled: boolean;
  readonly errorMessage: string | null;
}

export interface AgentModelEnabledActionResult {
  readonly backend: string;
  readonly enabled: boolean;
  readonly errorMessage: string | null;
  readonly model: string;
}

export interface AgentModelFavoriteActionResult {
  readonly backend: string;
  readonly errorMessage: string | null;
  readonly favorite: boolean;
  readonly model: string;
}

export interface AgentModelsEnabledActionResult {
  readonly backend: string;
  readonly enabled: boolean;
  readonly errorMessage: string | null;
}

export interface AgentSetupActionResult {
  readonly backend: string;
  readonly disabled: boolean;
  readonly errorMessage: string | null;
  readonly mode: string;
  readonly runId: string | null;
}
