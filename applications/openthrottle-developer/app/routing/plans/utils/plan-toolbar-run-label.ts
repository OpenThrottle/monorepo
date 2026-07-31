/**
 * @description Accessible label for the {@link PlanToolbar} Run/Queue button,
 * varying with the plan status. Hoisted from the component file per
 * component-primitive-shape R4 (pure helpers live in the sibling utils/
 * folder).
 */
export const getPlanToolbarRunButtonLabel = (planStatus?: string): string => {
  switch (planStatus) {
    case 'COMPLETED':
      return 'Completed';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'PENDING':
      return 'Add to Queue';
    case 'QUEUED':
      return 'Queued';
    case 'SKIPPED':
      return 'Skipped';

    default:
      return 'Run plan';
  }
};
