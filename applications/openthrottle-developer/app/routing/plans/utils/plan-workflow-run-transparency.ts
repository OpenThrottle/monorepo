/**
 * @description Formatting helper for {@link PlanWorkflowRunTransparency}'s
 * recent-runs table. Hoisted out of the component per
 * component-primitive-shape R4.
 */

/** ISO timestamp for a BullMQ finishedOn value; em dash when absent/invalid. */
export const formatFinishedOn = (
  finishedOn: number | null | undefined,
): string => {
  if (finishedOn == null || Number.isNaN(finishedOn)) {
    return '—';
  }

  return new Date(finishedOn).toISOString();
};
