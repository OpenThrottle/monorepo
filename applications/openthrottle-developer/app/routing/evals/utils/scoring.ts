/**
 * @description The score-next run-through: which trajectory a rater should
 * open next, derived from the plan-group listing in the order it lists them.
 */
import type {
  AgentTrajectoryScoringGroupFragment,
  AgentTrajectoryScoringItemFragment,
} from '~/__generated__/graphql';
import type {
  TrajectoryScoring,
  TrajectoryScoringNext,
} from '~/routing/evals/types';

/**
 * @description The first trajectory in a group's order still waiting on your
 * verdict, or null when every listed one has it.
 */
export const findFirstUnscoredTrajectory = (
  items: readonly AgentTrajectoryScoringItemFragment[],
): string | null => {
  const item = items.find((candidate) => {
    return candidate.verdict == null;
  });

  return item?.id ?? null;
};

export interface PickNextScoringTargetInput {
  readonly currentPlanId: string | null;
  readonly currentTrajectoryId: string;
  /** This plan's group with every trajectory, or null when the plan is unknown. */
  readonly planGroup: AgentTrajectoryScoringGroupFragment | null;
  /** The first groups that still have unscored trajectories, newest first. */
  readonly unscoredGroups: readonly AgentTrajectoryScoringGroupFragment[];
}

/**
 * @description Next unscored in this plan — the first after the current one
 * in group order, else the first before it — then the first unscored row of
 * the next plan that has any, then nothing left.
 */
export const pickNextScoringTarget = (
  input: PickNextScoringTargetInput,
): TrajectoryScoringNext => {
  const items = input.planGroup?.trajectories ?? [];
  const index = items.findIndex((item) => {
    return item.id === input.currentTrajectoryId;
  });
  const rotated = [
    ...items.slice(index + 1),
    ...items.slice(0, Math.max(index, 0)),
  ];
  const others = rotated.filter((item) => {
    return item.id !== input.currentTrajectoryId;
  });
  const inPlan = findFirstUnscoredTrajectory(others);

  if (inPlan !== null) {
    return { kind: 'in-plan', trajectoryId: inPlan };
  }

  const nextGroup = input.unscoredGroups.find((group) => {
    return (group.planId ?? null) !== input.currentPlanId;
  });
  const nextId = nextGroup
    ? findFirstUnscoredTrajectory(nextGroup.trajectories)
    : null;

  if (nextGroup === undefined || nextId === null) {
    return { kind: 'all-scored' };
  }

  return {
    kind: 'next-plan',
    planTitle: nextGroup.planTitle ?? null,
    trajectoryId: nextId,
  };
};

/**
 * @description The viewer's scoring state: this plan's progress (zero of zero
 * when the plan is unknown) and where "score next" goes.
 */
export const buildTrajectoryScoring = (
  input: PickNextScoringTargetInput,
): TrajectoryScoring => {
  return {
    next: pickNextScoringTarget(input),
    scoredCount: input.planGroup?.scoredCount ?? 0,
    trajectoryCount: input.planGroup?.trajectoryCount ?? 0,
  };
};
