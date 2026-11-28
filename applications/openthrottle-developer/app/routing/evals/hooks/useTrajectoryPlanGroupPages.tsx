import * as React from 'react';
import { useFetcher } from 'react-router';

import type {
  AgentTrajectoryPlanGroupPageRowFragment,
  AgentTrajectoryPlanGroupRowFragment,
} from '~/__generated__/graphql';
import type { TrajectoryScoreFilterValue } from '~/routing/evals/config/defaults';
import { buildTrajectoriesListHref } from '~/routing/evals/utils/hrefs';

export interface UseTrajectoryPlanGroupPagesOptions {
  readonly filter: TrajectoryScoreFilterValue;
  /** The page the route loader served; a new one (another filter) resets the list. */
  readonly initialPage: AgentTrajectoryPlanGroupPageRowFragment;
  readonly repositoryId: string | null;
}

export interface UseTrajectoryPlanGroupPagesResult {
  /** Every plan group loaded so far, in server order. */
  readonly groups: readonly AgentTrajectoryPlanGroupRowFragment[];
  readonly hasNextPage: boolean;
  readonly isLoadingMore: boolean;
  readonly onLoadMore: () => void;
}

/**
 * @description The Trajectories tab's plan groups across "Load more" pages.
 * The first page comes from the route loader; each further page is fetched
 * from the same loader with the previous page's cursor and appended.
 */
export const useTrajectoryPlanGroupPages = (
  options: UseTrajectoryPlanGroupPagesOptions,
): UseTrajectoryPlanGroupPagesResult => {
  const { filter, initialPage, repositoryId } = options;

  // Hooks
  const fetcher = useFetcher<{
    readonly page: AgentTrajectoryPlanGroupPageRowFragment;
  }>();
  const [loaded, setLoaded] = React.useState<{
    readonly base: AgentTrajectoryPlanGroupPageRowFragment;
    readonly pages: readonly AgentTrajectoryPlanGroupPageRowFragment[];
  }>({ base: initialPage, pages: [] });
  const appended = React.useRef<unknown>(null);

  // Setup
  const pages = loaded.base === initialPage ? loaded.pages : [];
  const lastPage = pages[pages.length - 1] ?? initialPage;
  const groups = [initialPage, ...pages].flatMap((page) => {
    return page.groups;
  });
  const isLoadingMore = fetcher.state !== 'idle';

  // Handlers
  const onLoadMore = (): void => {
    const after = lastPage.endCursor ?? null;

    if (!lastPage.hasNextPage || after === null || isLoadingMore) return;

    fetcher.load(buildTrajectoriesListHref({ after, filter, repositoryId }));
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const data = fetcher.data;

    if (data === undefined || appended.current === data) return;

    appended.current = data;
    setLoaded((previous) => {
      const kept = previous.base === initialPage ? previous.pages : [];

      return { base: initialPage, pages: [...kept, data.page] };
    });
  }, [fetcher.data, initialPage]);

  // 🔌 Short Circuit

  return {
    groups,
    hasNextPage: lastPage.hasNextPage,
    isLoadingMore,
    onLoadMore,
  };
};
