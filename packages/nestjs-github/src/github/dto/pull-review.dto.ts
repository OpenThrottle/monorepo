/**
 * @description One review from GET /repos/:owner/:repo/pulls/:number/reviews (state and submitted_at for review cycle time).
 */

/** GitHub review state from REST API. */
export type PullReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENT';

export interface PullReviewDto {
  readonly state: PullReviewState;
  readonly submittedAt: string;
}
