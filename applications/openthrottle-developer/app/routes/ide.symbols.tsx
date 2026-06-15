import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GetWorkspaceSettingsDocument } from '~/__generated__/graphql';
import { resolveSelectedRepository } from '~/routing/ide/utils/repositories';
import type { Route } from '@/app/routes/+types/ide.symbols';

/**
 * Resource route (loader-only) for the lazy symbols tier: returns the workspace's
 * exported symbols for the selected repository. Hit by a fetcher when the Symbols
 * tab opens. The ts-morph engine call runs in a dynamically-imported `.server`
 * module so it never reaches the client bundle.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const repositoryId = url.searchParams.get('repositoryId');

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

  const { exportsVM } = await import('~/routing/ide/data/ide-engine.server');

  return exportsVM(resolved.config, resolved.repository);
};
