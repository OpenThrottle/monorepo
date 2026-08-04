/**
 * @description App-owned adapter for {@link RolloutProvider}. Fetches evaluated
 * flags via the same-origin resource route so GraphQL + `API_URL_INTERNAL` stay
 * server-side (browser has no `process` for `@openthrottle/nodejs-graphql`).
 */

import type {
  RolloutEvaluation,
  RolloutFetchEvaluations,
} from '@openthrottle/react-router-rollout';
import type { RolloutEvaluationsResponse } from '~/routes/resources.rollout-evaluations';

export const ROLLOUT_EVALUATIONS_ROUTE = '/resources/rollout-evaluations';

const buildRolloutEvaluationsUrl = (args: {
  readonly anonymousId?: string | null;
  readonly applicationKey: string;
}): string => {
  const params = new URLSearchParams({
    applicationKey: args.applicationKey,
  });

  if (args.anonymousId != null && args.anonymousId !== '') {
    params.set('anonymousId', args.anonymousId);
  }

  return `${ROLLOUT_EVALUATIONS_ROUTE}?${params.toString()}`;
};

/**
 * Fetches evaluated flags for the given applicationKey (+ optional anonymousId).
 */
export const fetchRolloutEvaluations: RolloutFetchEvaluations = async (
  args,
): Promise<readonly RolloutEvaluation[]> => {
  const response = await fetch(buildRolloutEvaluationsUrl(args), {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Rollout evaluations request failed (${response.status} ${response.statusText})`,
    );
  }

  const body: RolloutEvaluationsResponse = await response.json();

  return body.evaluations;
};
