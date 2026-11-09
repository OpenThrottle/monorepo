import type { ScheduledAgentJobsLoaders } from './loaders/loaders.service.ts';
import type { ScheduledAgentJobRepositoryObject } from './scheduled-agent-job.object.ts';

/**
 * @description Loads a targeted checkout for display, batched per request. A deleted checkout resolves
 * to null rather than an error: the run's `resolvedCwd` still records where it happened.
 */
export const resolveTargetRepository = async (
  loaders: ScheduledAgentJobsLoaders,
  repositoryCheckoutId: string | null,
): Promise<ScheduledAgentJobRepositoryObject | null> => {
  if (repositoryCheckoutId === null) return null;

  const checkout = await loaders.checkoutLoader.load(repositoryCheckoutId);
  if (checkout === null) return null;

  return {
    displayName: checkout.displayName,
    filesystemPath: checkout.filesystemPath,
    id: checkout.id,
  };
};
