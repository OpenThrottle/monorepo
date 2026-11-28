import type { TrajectoryScoreFilterValue } from '~/routing/evals/config/defaults';
import {
  TRAJECTORY_SCORE_FILTER,
  TRAJECTORY_SCORE_FILTERS,
  TRAJECTORY_VERDICTS,
} from '~/routing/evals/config/defaults';
import type { TrajectoryVerdict } from '~/routing/evals/types';

/**
 * @description Narrows a stored or submitted verdict to `pass` / `fail`;
 * `null` for anything else (a blank form field, a value from a newer server).
 */
export const parseTrajectoryVerdict = (
  value: unknown,
): TrajectoryVerdict | null => {
  const match = TRAJECTORY_VERDICTS.find((verdict) => {
    return verdict === value;
  });

  return match ?? null;
};

/**
 * @description The Trajectories tab's score filter from the URL. Anything
 * missing or unknown is `unscored`, the tab's to-do default.
 */
export const parseTrajectoryScoreFilter = (
  value: string | null,
): TrajectoryScoreFilterValue => {
  const match = TRAJECTORY_SCORE_FILTERS.find((filter) => {
    return filter === value;
  });

  return match ?? TRAJECTORY_SCORE_FILTER.unscored;
};
