export interface ProjectPlanProgress {
  readonly completed: number;
  readonly total: number;
}

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

/**
 * @description The prompt that files a new plan straight into this project.
 * Plans are authored through the OpenThrottle MCP rather than a web form, so the
 * project page hands the user a prompt whose `create_plan` call carries the
 * project id.
 */
export const buildNewPlanPrompt = (project: {
  readonly id: string;
  readonly name: string;
}): string => {
  return `Create a plan in the OpenThrottle project "${project.name}" (pass projectId: ${project.id} to create_plan). `;
};
