import * as React from 'react';

export interface UseTrajectoryStepWindowOptions {
  /** Steps revealed per "show more" press, and on first render. */
  readonly batchSize: number;
  /** Steps in the trajectory. */
  readonly total: number;
}

export interface UseTrajectoryStepWindowResult {
  readonly hasMore: boolean;
  readonly onShowAll: () => void;
  readonly onShowMore: () => void;
  /** How many leading steps to render. */
  readonly visibleCount: number;
}

/**
 * @description Renders a long trajectory in batches: the first `batchSize`
 * steps on mount, the next batch per `onShowMore`, everything on `onShowAll`.
 * Keeps a 600-step timeline's first paint as cheap as a 100-step one.
 */
export const useTrajectoryStepWindow = (
  options: UseTrajectoryStepWindowOptions,
): UseTrajectoryStepWindowResult => {
  const { batchSize, total } = options;

  // Hooks
  const [requested, setRequested] = React.useState(batchSize);

  // Setup
  const visibleCount = Math.min(requested, total);
  const hasMore = visibleCount < total;

  // Handlers
  const onShowMore = (): void => {
    setRequested((current) => {
      return current + batchSize;
    });
  };

  const onShowAll = (): void => {
    setRequested(total);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { hasMore, onShowAll, onShowMore, visibleCount };
};
