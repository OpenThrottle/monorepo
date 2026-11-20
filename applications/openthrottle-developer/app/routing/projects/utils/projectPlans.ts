export type ProjectPlanMoveDirection = 'down' | 'up';

export interface ProjectPlanProgress {
  readonly completed: number;
  readonly total: number;
}

/**
 * @description Returns `planIds` with `planId` swapped with its neighbour in
 * `direction`. An id that is missing or already at that edge returns the order
 * unchanged, so a stale click never produces a surprising reorder.
 */
export const moveProjectPlanId = (
  planIds: readonly string[],
  planId: string,
  direction: ProjectPlanMoveDirection,
): string[] => {
  const next = [...planIds];
  const index = next.indexOf(planId);
  const target = direction === 'up' ? index - 1 : index + 1;
  const current = next[index];
  const neighbour = next[target];
  if (index === -1 || current === undefined || neighbour === undefined) {
    return next;
  }
  next[index] = neighbour;
  next[target] = current;
  return next;
};

/**
 * @description Completed / total plan counts for a project. Only COMPLETED
 * counts as done: a plan is finished when its status says so, whatever its
 * task counters read.
 */
export const getProjectPlanProgress = (
  plans: readonly { readonly status: string }[],
): ProjectPlanProgress => {
  const completed = plans.filter((plan) => plan.status === 'COMPLETED').length;
  return { completed, total: plans.length };
};

/** @description Candidates for the add-plan picker: plans outside this project. */
export const getAvailablePlans = <
  TPlan extends { readonly projectId?: string | null },
>(
  plans: readonly TPlan[],
  projectId: string,
): TPlan[] => {
  return plans.filter((plan) => plan.projectId !== projectId);
};

/** @description Candidates for the link picker: repositories not yet linked. */
export const getUnlinkedRepositories = <TRepository extends { id: string }>(
  all: readonly TRepository[],
  linked: readonly { readonly id: string }[],
): TRepository[] => {
  const linkedIds = new Set(linked.map((repository) => repository.id));
  return all.filter((repository) => !linkedIds.has(repository.id));
};
