/**
 * @description How many runs the plan-detail run history query fetches. Must equal the
 * `planRunsByPlanId(input: { limit: … })` literal in `app/routes/plans.$planId._index.tsx.graphql`
 * (GraphQL documents cannot import a constant); the history footer says "Showing the 25 most
 * recent runs" when exactly this many come back.
 */
export const PLAN_RUN_HISTORY_FETCH_LIMIT = 25;
