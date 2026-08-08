import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { PlanRefResolverData } from '@openthrottle/react-router-ui';
import { normalizeIdFragment } from '@openthrottle/react-router-utils';
import { ResolvePlanRefDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.resolve-plan-ref';

/**
 * Resource route (loader-only) backing the ⌘K commander's short-id-prefix
 * lookup — `/resources/resolve-plan-ref?prefix=<hex>`. `resolvePlanRef` is a
 * server-side GraphQL query (client GraphQL transport is server-only), so the
 * palette debounces a `useFetcher().load` here via {@link usePlanRefResolver}.
 * The normalized `prefix` is echoed back so the hook can ignore results from a
 * stale keystroke. Re-normalizes defensively and degrades to an empty result on
 * a too-short prefix or a resolver error rather than throwing into the palette.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<PlanRefResolverData> => {
  const url = new URL(args.request.url);
  const prefix = normalizeIdFragment(url.searchParams.get('prefix') ?? '');

  if (prefix.length === 0) {
    return { matches: [], prefix };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      ResolvePlanRefDocument,
      { prefix },
    );

    return { matches: data.resolvePlanRef, prefix };
  } catch {
    return { matches: [], prefix };
  }
};
