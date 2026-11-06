import type {
  DriverId,
  DriverReasoningEffort,
} from '@openthrottle/openthrottle-drivers';

/**
 * @description How the CLI is billed. Recorded on every run so a report can flag a comparison
 * between runs with different auth modes.
 * @public
 */
export type EvalAuthMode = 'api_key' | 'subscription';

/**
 * @description Token budget for a whole run. `maxTokens` of `null` means unlimited. Scheduling
 * stops once input plus output tokens of finished trials reach it.
 * @public
 */
export interface EvalBudget {
  readonly maxTokens: number | null;
}

/**
 * @description The knobs of one run. `concurrency` defaults to 1 (one subscription account).
 * @public
 */
export interface EvalRunConfig {
  readonly attempts: number;
  readonly authMode: EvalAuthMode;
  readonly budget: EvalBudget;
  readonly concurrency: number;
  readonly driverId: DriverId;
  readonly effort: DriverReasoningEffort | undefined;
  readonly model: string | undefined;
}
