import { TRAJECTORY_VERDICTS } from '~/routing/evals/config/defaults';
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
