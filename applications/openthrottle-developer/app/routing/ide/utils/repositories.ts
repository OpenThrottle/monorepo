import type { WorkspaceConfig } from '@openthrottle/openthrottle-ide';
import type {
  IdeRepositoryOption,
  IdeRepositoryRef,
} from '@openthrottle/react-router-ide';

/**
 * The subset of a `WorkspaceLocalRepositoryObject` (from the `getWorkspaceSettings`
 * GraphQL query) the IDE route needs. Kept local so this stays a pure mapping
 * helper with no GraphQL or Node dependency.
 */
export interface IdeWorkspaceRepository {
  displayName: string;
  filesystemPath: string;
  id: string;
  projectId?: string | null;
}

/** A repository resolved to the engine config + the UI's repository ref. */
export interface ResolvedIdeRepository {
  config: WorkspaceConfig;
  repository: IdeRepositoryRef;
}

/** Map registered local repositories to the selector's plain `{ id, label }` options. */
export const toRepositoryOptions = (
  repositories: IdeWorkspaceRepository[],
): IdeRepositoryOption[] =>
  repositories.map((repository) => ({
    id: repository.id,
    label: repository.displayName,
  }));

/**
 * Resolve the selected repository into a {@link WorkspaceConfig} (rooted at its
 * server-validated `filesystemPath`) and an {@link IdeRepositoryRef}. Returns null
 * when no repository is selected or the id doesn't match — the route then forces a
 * selection (no monorepo-root fallback).
 */
export const resolveSelectedRepository = (
  repositories: IdeWorkspaceRepository[],
  repositoryId: string | null,
): ResolvedIdeRepository | null => {
  if (repositoryId === null || repositoryId === '') {
    return null;
  }

  const match = repositories.find(
    (repository) => repository.id === repositoryId,
  );

  if (match === undefined) {
    return null;
  }

  return {
    config: { root: match.filesystemPath },
    repository: {
      displayName: match.displayName,
      projectId: match.projectId ?? undefined,
      repositoryId: match.id,
    },
  };
};
