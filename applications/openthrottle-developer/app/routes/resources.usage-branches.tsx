import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GetUsageBranchSearchDocument } from '~/__generated__/graphql';
import type { UsageBranchSearchData } from '~/routing/usage/hooks/useUsageBranchSearch';
import type { Route } from '@/app/routes/+types/resources.usage-branches';

/**
 * Resource route (loader-only) backing the `/usage` branch filter —
 * `/resources/usage-branches?start=&end=&query=&limit=`. `skillUsageGitBranches`
 * is a server-side GraphQL query (client GraphQL transport is server-only), so
 * the combobox debounces a `useFetcher().load` here via
 * {@link useUsageBranchSearch}. The normalized `query` is echoed back so the
 * hook can drop results from a stale keystroke, and a resolver error degrades to
 * an empty list rather than throwing into the popover.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<UsageBranchSearchData> => {
  const searchParams = new URL(args.request.url).searchParams;
  const query = (searchParams.get('query') ?? '').trim();
  const limitParam = Number(searchParams.get('limit'));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null;

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      GetUsageBranchSearchDocument,
      {
        end: searchParams.get('end') ?? '',
        limit,
        query: query === '' ? null : query,
        start: searchParams.get('start') ?? '',
      },
    );

    return {
      hasMore: data.skillUsageGitBranches.hasMore,
      items: data.skillUsageGitBranches.items,
      query,
    };
  } catch {
    return { hasMore: false, items: [], query };
  }
};
