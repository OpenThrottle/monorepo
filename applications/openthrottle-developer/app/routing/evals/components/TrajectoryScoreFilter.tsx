import { Button, ButtonGroup, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { TrajectoryScoreFilterValue } from '~/routing/evals/config/defaults';
import { TRAJECTORY_SCORE_FILTERS } from '~/routing/evals/config/defaults';
import { EVAL_TRAJECTORIES_COPY } from '~/routing/evals/data/copy';

export interface TrajectoryScoreFilterProps {
  readonly active: TrajectoryScoreFilterValue;
  /** The URL that shows a filter, keeping the rest of the query. */
  readonly buildHref: (filter: TrajectoryScoreFilterValue) => string;
  readonly className?: string;
}

/**
 * @description Unscored / Scored / All, judged by your own label. Each choice
 * is a link, so the filter lives in the URL and survives a reload or a share.
 */
export const TrajectoryScoreFilter = (
  props: TrajectoryScoreFilterProps,
): React.ReactElement => {
  const { active, buildHref, className } = props;

  // Hooks

  // Setup
  const copy = EVAL_TRAJECTORIES_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <nav
      aria-label={copy.filterLabel}
      className={cn(className)}
      data-testid="TrajectoryScoreFilter"
    >
      <ButtonGroup>
        {TRAJECTORY_SCORE_FILTERS.map((filter) => {
          const isActive = filter === active;

          return (
            <Button
              asChild={true}
              key={filter}
              size="sm"
              variant={isActive ? 'secondary' : 'outline'}
            >
              <Link
                aria-current={isActive ? 'page' : undefined}
                to={buildHref(filter)}
              >
                {copy.filters[filter]}
              </Link>
            </Button>
          );
        })}
      </ButtonGroup>
    </nav>
  );
};
