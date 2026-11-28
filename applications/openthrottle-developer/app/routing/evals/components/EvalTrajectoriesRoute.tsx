import { Button, cn } from '@openthrottle/react-router-shadcn';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { FlaskConicalIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type {
  AgentTrajectoryPlanGroupPageRowFragment,
  AgentTrajectoryPlanGroupRowFragment,
} from '~/__generated__/graphql';
import type { EvalRepositoryPickerRepository } from '~/routing/evals/components/EvalRepositoryPicker';
import { EvalRepositoryPicker } from '~/routing/evals/components/EvalRepositoryPicker';
import { EvalsTabs } from '~/routing/evals/components/EvalsTabs';
import { TrajectoryPlanGroup } from '~/routing/evals/components/TrajectoryPlanGroup';
import { TrajectoryScoreFilter } from '~/routing/evals/components/TrajectoryScoreFilter';
import type { TrajectoryScoreFilterValue } from '~/routing/evals/config/defaults';
import { EVALS_TAB } from '~/routing/evals/config/defaults';
import {
  EVAL_RUNS_COPY,
  EVAL_TRAJECTORIES_COPY,
} from '~/routing/evals/data/copy';
import { useTrajectoryPlanGroupPages } from '~/routing/evals/hooks/useTrajectoryPlanGroupPages';
import {
  buildTrajectoriesListHref,
  buildTrajectoryViewerHref,
} from '~/routing/evals/utils/hrefs';
import { findFirstUnscoredTrajectory } from '~/routing/evals/utils/scoring';

export interface EvalTrajectoriesRouteProps {
  readonly className?: string;
  readonly filter: TrajectoryScoreFilterValue;
  /** The first page of plan groups, from the route loader. */
  readonly page: AgentTrajectoryPlanGroupPageRowFragment;
  readonly repositories: readonly EvalRepositoryPickerRepository[];
  /** Null for every repository. */
  readonly selectedRepositoryId: string | null;
}

/**
 * @description The Trajectories tab: recorded runs grouped by plan, filtered
 * by your score, a repository picker, and "Load more" for older plans.
 */
export const EvalTrajectoriesRoute = (
  props: EvalTrajectoriesRouteProps,
): React.ReactElement => {
  const { className, filter, page, repositories, selectedRepositoryId } = props;

  // Hooks
  const { groups, hasNextPage, isLoadingMore, onLoadMore } =
    useTrajectoryPlanGroupPages({
      filter,
      initialPage: page,
      repositoryId: selectedRepositoryId,
    });

  // Setup
  const copy = EVAL_TRAJECTORIES_COPY;
  const buildFilterHref = (next: TrajectoryScoreFilterValue): string => {
    return buildTrajectoriesListHref({
      after: null,
      filter: next,
      repositoryId: selectedRepositoryId,
    });
  };
  const buildRepositoryHref = (repositoryId: string | null): string => {
    return buildTrajectoriesListHref({ after: null, filter, repositoryId });
  };

  // Handlers

  // Markup
  const renderStartScoring = (
    group: AgentTrajectoryPlanGroupRowFragment,
  ): React.ReactElement | null => {
    const firstUnscored = findFirstUnscoredTrajectory(group.trajectories);

    if (firstUnscored === null) return null;

    return (
      <Button asChild={true} size="sm" variant="outline">
        <Link to={buildTrajectoryViewerHref(firstUnscored)}>
          {copy.startScoring}
        </Link>
      </Button>
    );
  };
  const empty = (
    <p
      className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm"
      data-testid="EvalTrajectoriesEmpty"
    >
      {copy.empty[filter]}
    </p>
  );
  const groupList = (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        return (
          <TrajectoryPlanGroup
            actions={renderStartScoring(group)}
            group={group}
            key={group.planId ?? 'unknown'}
          />
        );
      })}
    </div>
  );
  const loadMore = (
    <div className="flex justify-center">
      <Button
        disabled={isLoadingMore}
        onClick={onLoadMore}
        size="sm"
        variant="outline"
      >
        {isLoadingMore ? copy.loadingMore : copy.loadMore}
      </Button>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen
      className={cn('flex w-full flex-col gap-6 p-4 md:p-8 lg:p-12', className)}
    >
      <GlobalHeading
        heading="h1"
        icon={FlaskConicalIcon}
        title={EVAL_RUNS_COPY.pageTitle}
      />
      <EvalsTabs active={EVALS_TAB.trajectories} />
      <p className="text-muted-foreground text-sm">{copy.pageDescription}</p>
      <div
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        data-testid="EvalTrajectoriesRoute"
      >
        <EvalRepositoryPicker
          allLabel={copy.allRepositories}
          buildHref={buildRepositoryHref}
          label={copy.repositoryLabel}
          repositories={repositories}
          selectedRepositoryId={selectedRepositoryId}
        />
        <TrajectoryScoreFilter active={filter} buildHref={buildFilterHref} />
      </div>
      {groups.length > 0 ? groupList : empty}
      {hasNextPage ? loadMore : null}
    </GlobalScreen>
  );
};
