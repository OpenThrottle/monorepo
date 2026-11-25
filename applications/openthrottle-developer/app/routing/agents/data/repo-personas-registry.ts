/**
 * @description Types for repo persona entries discovered from `.agents/personas`
 * at request time (see `utils/discover-repo-personas.server.ts`).
 */
export interface RepoPersonaEntry {
  readonly repoRelativePath: string;
  readonly slug: string;
  readonly summary: string;
}
