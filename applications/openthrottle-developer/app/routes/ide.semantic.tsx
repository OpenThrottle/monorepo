import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { IDE_SEMANTIC_STATUS } from '@openthrottle/react-router-ide';
import type {
  IdeSemanticResult,
  SemanticMatch,
} from '@openthrottle/react-router-ide';
import {
  CodeIndexStatusDocument,
  CodeSemanticSearchDocument,
  GetWorkspaceSettingsDocument,
  IndexCodeRepositoryDocument,
} from '~/__generated__/graphql';
import { toSemanticStatus } from '~/routing/ide/utils/semantic-status';
import { resolveSelectedRepository } from '~/routing/ide/utils/repositories';
import type { Route } from '@/app/routes/+types/ide.semantic';

/**
 * Resource route for the semantic tier (GraphQL-backed, architecture B). The loader
 * returns the {@link IdeSemanticResult} envelope: it reads the repository's index
 * status and, when a query is present and the index is ready, the code-search
 * matches. The action enqueues a (re)index via the `indexCodeRepository` mutation.
 * Hit by a fetcher from the /ide Semantic tab (search + poll), and submitted to for
 * the Index action.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<IdeSemanticResult> => {
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

  const { repository } = resolved;
  const statusResult = await executeGraphqlWithAuth(
    args.request,
    CodeIndexStatusDocument,
    { repositoryId: repository.repositoryId },
  );
  const status = toSemanticStatus(statusResult.codeIndexStatus.status);
  const indexedChunks = statusResult.codeIndexStatus.indexedChunks;

  let matches: SemanticMatch[] = [];
  let available = status !== IDE_SEMANTIC_STATUS.unavailable;

  if (query.trim() !== '' && status === IDE_SEMANTIC_STATUS.ready) {
    const searchResult = await executeGraphqlWithAuth(
      args.request,
      CodeSemanticSearchDocument,
      { input: { limit: null, query, repositoryId: repository.repositoryId } },
    );
    available = searchResult.codeSemanticSearch.available;
    matches = searchResult.codeSemanticSearch.matches.map((match) => ({
      content: match.content,
      endLine: match.endLine,
      path: match.path,
      score: match.score,
      startLine: match.startLine,
    }));
  }

  return { available, indexedChunks, matches, query, repository, status };
};

/** Enqueue a (re)index for the posted repositoryId. */
export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const repositoryId = String(formData.get('repositoryId') ?? '');
  if (repositoryId === '') {
    throw new Response('A repositoryId is required', { status: 400 });
  }

  const result = await executeGraphqlWithAuth(
    args.request,
    IndexCodeRepositoryDocument,
    { repositoryId },
  );

  return {
    repositoryId: result.indexCodeRepository.repositoryId,
    status: toSemanticStatus(result.indexCodeRepository.status),
  };
};
