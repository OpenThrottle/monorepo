import type { PlanRun } from '@openthrottle/nestjs-repositories';

export interface RecordSettledRunArtifactsInput {
  /** Branch head sha at PR-open. Null when the caller did not supply one. */
  readonly headSha: string | null;
  /** The settled run. */
  readonly planRun: PlanRun;
  /** PR number the run opened. Null when the caller did not supply one. */
  readonly prNumber: number | null;
}
