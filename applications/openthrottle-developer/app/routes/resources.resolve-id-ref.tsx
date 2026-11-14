import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { IdRefResolverData } from '@openthrottle/react-router-ui';
import { normalizeIdFragment } from '@openthrottle/react-router-utils';

import type { Route } from '@/app/routes/+types/resources.resolve-id-ref';
import { ResolveIdRefDocument } from '~/__generated__/graphql';
import { isIdRefMatch, toIdRefMatch } from '~/global/utils/id-ref-match';

/**
 * Resource route (loader-only) backing the ⌘K commander's id lookup —
 * `/resources/resolve-id-ref?ref=<hex>`, where `ref` is a short fragment or a
 * full UUID. `resolveIdRef` is a server-side GraphQL query (client GraphQL
 * transport is server-only), so the palette debounces a `useFetcher().load`
 * here via `useIdRefResolver`. The normalized `ref` is echoed back so the hook
 * can ignore results from a stale keystroke. Re-normalizes defensively and
 * degrades to an empty result on invalid input or a resolver error rather than
 * throwing into the palette.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<IdRefResolverData> => {
  const url = new URL(args.request.url);
  const ref = normalizeIdFragment(url.searchParams.get('ref') ?? '');

  if (ref.length === 0) {
    return { matches: [], ref };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      ResolveIdRefDocument,
      { ref },
    );

    return {
      matches: data.resolveIdRef.map(toIdRefMatch).filter(isIdRefMatch),
      ref,
    };
  } catch {
    return { matches: [], ref };
  }
};
