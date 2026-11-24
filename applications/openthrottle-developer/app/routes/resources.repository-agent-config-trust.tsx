import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/resources.repository-agent-config-trust';
import { UpdateRepositoryDocument } from '~/__generated__/graphql';

/** JSON shape returned to the repository detail's trust action. */
export interface RepositoryAgentConfigTrustActionResult {
  readonly errorMessage: string | null;
  readonly repositoryId: string;
  readonly trusted: boolean;
}

/**
 * Resource route action backing the repository detail's one-click trust action —
 * `POST /resources/repository-agent-config-trust` with `repositoryId` + `trusted` fields.
 *
 * The mutation sends ONLY `agentConfigTrusted` and `id`, so a trust flip cannot clobber the
 * repository's name, default branch, linked project or other flags. The server re-checks
 * ownership. On failure the pre-flip value comes back in `trusted` so the caller reverts.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<RepositoryAgentConfigTrustActionResult> => {
  const formData = await args.request.formData();
  const repositoryId = String(formData.get('repositoryId') ?? '');
  const trusted = formData.get('trusted') === 'true';

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      UpdateRepositoryDocument,
      { input: { agentConfigTrusted: trusted, id: repositoryId } },
    );

    // Read the flag back off the persisted checkouts: it is stored per checkout and flipped together.
    return {
      errorMessage: null,
      repositoryId,
      trusted: (data.updateRepository.checkouts ?? []).some(
        (checkout) => checkout.agentConfigTrusted,
      ),
    };
  } catch (error) {
    const fallbackMessage = 'Failed to update trust.';
    const errorMessage =
      error instanceof Error ? error.message : fallbackMessage;

    return { errorMessage, repositoryId, trusted: !trusted };
  }
};
