import type { RepoPersonaEntry } from '~/routing/agents/data/data.repo-personas-registry';

/**
 * @description Returns the count of discovered personas for list UI stats.
 */
export const getRepoPersonasRegistryCount = (
  entries: ReadonlyArray<RepoPersonaEntry>,
): number => {
  return entries.length;
};
