import type { EvalCase } from './eval-case.ts';
import type { EvalTrial } from './eval-trial.ts';

/**
 * @description A grader's answer. `error` means the grader itself could not decide, which is
 * different from the agent failing, and is excluded from pass rates.
 * @public
 */
export type GraderVerdict =
  | { readonly evidence: string; readonly kind: 'fail' }
  | { readonly evidence: string; readonly kind: 'pass' }
  | { readonly kind: 'error'; readonly reason: string };

/**
 * @description `code` is a deterministic check, `judge` asks a model one binary question and
 * must quote evidence, `human` is a label supplied by a person.
 * @public
 */
export type GraderKind = 'code' | 'human' | 'judge';

/**
 * @description The grader SPI. `version` changes whenever the check changes, so stored grades and
 * the judge cache never mix two meanings.
 * @public
 */
export interface Grader {
  readonly grade: (
    trial: EvalTrial,
    evalCase: EvalCase,
  ) => Promise<GraderVerdict>;
  readonly id: string;
  readonly kind: GraderKind;
  readonly version: string;
}
