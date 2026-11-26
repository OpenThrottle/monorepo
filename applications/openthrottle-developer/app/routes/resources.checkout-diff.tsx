import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/resources.checkout-diff';
import {
  GetCheckoutDiffDocument,
  GetCheckoutFileDiffDocument,
} from '~/__generated__/graphql';
import type { CheckoutDiffResourceData } from '~/routing/home/types';

/**
 * Resource route (loader-only) backing the home session drawer's Changes
 * section — `/resources/checkout-diff?checkoutId=<id>` for the checkout's diff
 * against its base branch, plus `&path=<relative path>` for one file's patch.
 * The server resolves the checkout by id and owner and validates the path; this
 * route never sees a filesystem path. A failed query degrades to a `failed`
 * result (the drawer then shows its unavailable line) rather than throwing
 * into the panel. The request is echoed so {@link useCheckoutDiff} can drop a
 * stale response.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<CheckoutDiffResourceData> => {
  const searchParams = new URL(args.request.url).searchParams;
  const checkoutId = (searchParams.get('checkoutId') ?? '').trim();
  const path = searchParams.get('path') ?? undefined;
  const failed: CheckoutDiffResourceData = {
    checkoutId,
    kind: 'failed',
    path,
  };

  if (checkoutId === '') {
    return failed;
  }

  try {
    if (path === undefined) {
      const data = await executeGraphqlWithAuth(
        args.request,
        GetCheckoutDiffDocument,
        { checkoutId },
      );

      return { checkoutId, diff: data.checkoutDiff, kind: 'diff' };
    }

    const data = await executeGraphqlWithAuth(
      args.request,
      GetCheckoutFileDiffDocument,
      { checkoutId, path },
    );

    return { checkoutId, file: data.checkoutFileDiff, kind: 'file', path };
  } catch {
    return failed;
  }
};
