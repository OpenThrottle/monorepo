import type { GraderVerdict } from './grader.ts';

/**
 * @description One grader's verdict on one trial. `costUsd` is `null` for code graders and for
 * judges whose driver cannot be priced.
 * @public
 */
export interface EvalGrade {
  readonly attempt: number;
  readonly caseId: string;
  readonly costUsd: number | null;
  readonly graderId: string;
  readonly graderVersion: string;
  readonly verdict: GraderVerdict;
}
