import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GetWorkspaceSettingsDocument } from '~/__generated__/graphql';
import { resolveSelectedRepository } from '~/routing/ide/utils/repositories';
import type { Route } from '@/app/routes/+types/ide.symbol';

/**
 * Resource route (loader-only) for a single symbol's definition + references.
 * Hit by the `useSymbolDetails` fetcher with `?repositoryId=&path=&line=&name=`
 * when a symbol is clicked. The ts-morph engine call runs in a dynamically-imported
 * `.server` module so it never reaches the client bundle.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const url = new URL(args.request.url);
  const repositoryId = url.searchParams.get('repositoryId');
  const path = url.searchParams.get('path') ?? undefined;
  const name = url.searchParams.get('name') ?? undefined;
  const lineParam = url.searchParams.get('line');
  const line =
    lineParam !== null && lineParam !== '' ? Number(lineParam) : undefined;

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

  const { symbolTargetVM } =
    await import('~/routing/ide/data/ide-engine.server');

  return symbolTargetVM(resolved.config, resolved.repository, {
    line,
    name,
    path,
  });
};
