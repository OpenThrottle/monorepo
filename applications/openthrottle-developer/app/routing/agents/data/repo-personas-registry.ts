/**
 * @description Types for repo persona entries discovered from `.agents/personas`
 * at request time (see `discover-repo-personas.server.ts`).
 */
export interface RepoPersonaEntry {
  readonly repoRelativePath: string;
  readonly slug: string;
  readonly summary: string;
}

/**
 * @description Returns the count of discovered personas for list UI stats.
 */
export const getRepoPersonasRegistryCount = (
  entries: ReadonlyArray<RepoPersonaEntry>,
): number => entries.length;
