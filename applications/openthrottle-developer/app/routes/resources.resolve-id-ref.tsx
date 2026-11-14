import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type {
  IdRefMatch,
  IdRefResolverData,
} from '@openthrottle/react-router-ui';
import { normalizeIdFragment } from '@openthrottle/react-router-utils';

import type { Route } from '@/app/routes/+types/resources.resolve-id-ref';
import type { ResolveIdRefQuery } from '~/__generated__/graphql';
import { IdRefKind, ResolveIdRefDocument } from '~/__generated__/graphql';

type ResolvedIdRef = ResolveIdRefQuery['resolveIdRef'][number];

/**
 * @description Narrow a GraphQL `IdRefObject` into the client's discriminated
 * {@link IdRefMatch}. A TASK ref without a `planId` cannot be linked to, so it
 * is dropped rather than rendered as a dead row.
 */
const toIdRefMatch = (ref: ResolvedIdRef): IdRefMatch | null => {
  const { id, status, title } = ref;

  if (ref.kind === IdRefKind.Plan) {
    return { id, kind: 'PLAN', status, title };
  }

  if (ref.planId == null) {
    return null;
  }

  return {
    id,
    kind: 'TASK',
    planId: ref.planId,
    planTitle: ref.planTitle ?? null,
    status,
    title,
  };
};

const isIdRefMatch = (match: IdRefMatch | null): match is IdRefMatch => {
  return match !== null;
};

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
