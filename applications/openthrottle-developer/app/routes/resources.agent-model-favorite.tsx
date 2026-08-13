import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { SetAgentModelFavoriteDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.agent-model-favorite';

/** JSON shape returned by the toggle (mirrors SetAgentModelFavoriteResult + a client error slot). */
export interface AgentModelFavoriteActionResult {
  readonly backend: string;
  readonly errorMessage: string | null;
  readonly favorite: boolean;
  readonly model: string;
}

/**
 * Resource route action backing the /settings/setup per-MODEL favorite toggle —
 * `POST /resources/agent-model-favorite` with `backend` + `model` + `favorite` fields. The server
 * re-validates the backend against the drivers registry and enforces the SETTINGS_WRITE permission,
 * so a forged post from a user without permission is rejected server-side. On failure the caller
 * reverts optimistically and surfaces `errorMessage`.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<AgentModelFavoriteActionResult> => {
  const formData = await args.request.formData();
  const backend = String(formData.get('backend') ?? '');
  const model = String(formData.get('model') ?? '');
  const favorite = formData.get('favorite') === 'true';

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      SetAgentModelFavoriteDocument,
      { backend, favorite, model },
    );
    return {
      backend: data.setAgentModelFavorite.backend,
      errorMessage: null,
      favorite: data.setAgentModelFavorite.favorite,
      model: data.setAgentModelFavorite.model,
    };
  } catch (error) {
    // Report the pre-toggle state so the optimistic UI can revert.
    return {
      backend,
      errorMessage:
        error instanceof Error ? error.message : 'Failed to update the model.',
      favorite: !favorite,
      model,
    };
  }
};
