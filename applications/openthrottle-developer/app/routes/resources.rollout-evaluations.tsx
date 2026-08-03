import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { RolloutEvaluation } from '@openthrottle/react-router-rollout';
import { EvaluateFeatureFlagsDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.rollout-evaluations';

/** JSON shape returned to the client-side {@link RolloutProvider} fetcher. */
export interface RolloutEvaluationsResponse {
  readonly evaluations: readonly RolloutEvaluation[];
}

/**
 * Resource route (loader-only) supplying evaluated feature flags —
 * `GET /resources/rollout-evaluations?applicationKey=&anonymousId=`.
 *
 * Keeps `@openthrottle/nodejs-graphql` / `API_URL_INTERNAL` on the server.
 * Browser clients must not call `executeGraphql` directly (no `process` in the
 * browser). Cookie auth (when present) soft-enriches targeting via
 * {@link executeGraphqlWithAuth}; unauthenticated calls still succeed.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<RolloutEvaluationsResponse> => {
  const url = new URL(args.request.url);
  const applicationKey = url.searchParams.get('applicationKey') ?? '';

  if (applicationKey === '') {
    return { evaluations: [] };
  }

  const anonymousId = url.searchParams.get('anonymousId');
  const data = await executeGraphqlWithAuth(
    args.request,
    EvaluateFeatureFlagsDocument,
    {
      anonymousId:
        anonymousId != null && anonymousId !== '' ? anonymousId : null,
      applicationKey,
    },
  );

  return { evaluations: data.evaluateFeatureFlags };
};
