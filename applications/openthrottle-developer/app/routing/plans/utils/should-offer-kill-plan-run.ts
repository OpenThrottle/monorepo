/**
 * @description Whether the UI should offer stopping a Ralph / plan-run job for this plan status (queue or active worker).
 */
export const shouldOfferKillPlanRun = (
  status: string | null | undefined,
): boolean => status === 'QUEUED' || status === 'IN_PROGRESS';
