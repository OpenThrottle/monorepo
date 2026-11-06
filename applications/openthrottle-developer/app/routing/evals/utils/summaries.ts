import type { AgentTrajectorySummaryFragment } from '~/__generated__/graphql';
import { parseDate } from '~/global/utils/dates';
import { TRAJECTORY_SUMMARY_COPY } from '~/routing/evals/data/data.copy';
import {
  formatTrajectoryCost,
  formatTrajectoryCount,
  formatTrajectoryDuration,
  formatTrajectoryTokens,
} from '~/routing/evals/utils/formatters';

/** One labelled fact about a run, as the list row and viewer header show it. */
export interface TrajectorySummaryFact {
  readonly label: string;
  readonly value: string;
}

const timeOf = (trajectory: AgentTrajectorySummaryFragment): number => {
  const date = parseDate(String(trajectory.createdAt));

  return date === null ? 0 : date.getTime();
};

/**
 * @description The server lists a task's trajectories oldest first; the task
 * page reads newest first. Returns a new array and never mutates the input.
 */
export const sortTrajectoriesNewestFirst = (
  trajectories: readonly AgentTrajectorySummaryFragment[],
): readonly AgentTrajectorySummaryFragment[] => {
  return [...trajectories].sort((a, b) => {
    return timeOf(b) - timeOf(a);
  });
};

/**
 * @description The run facts shown for a trajectory, in reading order:
 * tokens (prompt incl. cached / completion), cost or "unpriced", duration,
 * tool calls and exit code.
 */
export const buildTrajectorySummaryFacts = (
  summary: AgentTrajectorySummaryFragment,
): readonly TrajectorySummaryFact[] => {
  const copy = TRAJECTORY_SUMMARY_COPY;
  const exitCode =
    summary.exitCode == null ? copy.unknown : `${summary.exitCode}`;

  return [
    { label: copy.tokens, value: formatTrajectoryTokens(summary) },
    { label: copy.cost, value: formatTrajectoryCost(summary.costUsd) },
    {
      label: copy.duration,
      value: formatTrajectoryDuration(summary.durationMs),
    },
    {
      label: copy.toolCalls,
      value: formatTrajectoryCount(summary.toolCallCount),
    },
    { label: copy.exitCode, value: exitCode },
  ];
};
