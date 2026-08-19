import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GetWorkspaceSettingsDocument } from '~/__generated__/graphql';
import { MAX_FILE_MENTION_RESULTS } from '~/routing/ide/config/file-mention';
import type { IdeFilesResponse } from '~/routing/ide/data/ide-files-response';
import { resolveSelectedRepository } from '~/routing/ide/utils/repositories';
import type { Route } from '@/app/routes/+types/ide.files';

/**
 * Resource route (loader-only) backing the chat composer's `@`-mention file
 * picker: `/ide/files?repositoryId=&q=`. Reuses the IDE's cheap ripgrep tier
 * (`listFilesVM`) rather than a new openthrottle-server GraphQL query.
 *
 * Security:
 * - The repository is resolved from the *user-scoped* `workspaceSettings`
 *   (`executeGraphqlWithAuth` runs as the caller); `resolveSelectedRepository`
 *   returns null for an id that is not in the caller's own list, so another
 *   user's `repositoryId` is rejected with a 400 — a client path is never
 *   trusted, the server-stored `filesystemPath` is the only root used.
 * - `listFilesVM` → `listFiles` honors `.gitignore` and applies the
 *   `filterRealPathsInsideRoot` symlink-escape guard, so returned paths never
 *   canonicalize outside the repository root (see openthrottle-ide's
 *   workspace.test.ts).
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<IdeFilesResponse> => {
  const url = args.url;
  const repositoryId = url.searchParams.get('repositoryId');
  const query = url.searchParams.get('q') ?? '';

  const data = await executeGraphqlWithAuth(
    args.request,
    GetWorkspaceSettingsDocument,
  );
  const resolved = resolveSelectedRepository(
    data.workspaceSettings.localRepositories,
    repositoryId,
  );

  if (resolved === null) {
    throw new Response('A valid repositoryId is required', { status: 400 });
  }

  const { listFilesVM } = await import('~/routing/ide/data/ide-engine.server');
  const listing = await listFilesVM(resolved.config, resolved.repository);

  const trimmed = query.trim().toLowerCase();
  if (trimmed === '') {
    return {
      paths: listing.paths,
      query,
      repositoryId: resolved.repository.repositoryId,
      truncated: listing.truncated,
    };
  }

  const matches = listing.paths.filter((path) =>
    path.toLowerCase().includes(trimmed),
  );

  return {
    paths: matches.slice(0, MAX_FILE_MENTION_RESULTS),
    query,
    repositoryId: resolved.repository.repositoryId,
    truncated: matches.length > MAX_FILE_MENTION_RESULTS,
  };
};
