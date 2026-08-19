import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { SetAgentModelsEnabledDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.agent-models-enabled';
import type { AgentModelsEnabledActionResult } from '~/routing/settings/data/agent-action-results';

/** JSON shape returned by the bulk toggle (mirrors SetAgentModelsEnabledResult + a client error slot). */

/**
 * Resource route action backing the /settings/agents per-agent select-all / deselect-all affordance —
 * `POST /resources/agent-models-enabled` with `backend` + `enabled` + a JSON-encoded `models` list.
 * One mutation flips EVERY model of the backend at once (vs. one request per model), so a 200-model
 * agent is a single round trip. The server re-validates the backend against the drivers registry and
 * enforces SETTINGS_WRITE. On failure the caller reverts optimistically and surfaces `errorMessage`.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<AgentModelsEnabledActionResult> => {
  const formData = await args.request.formData();
  const backend = String(formData.get('backend') ?? '');
  const enabled = formData.get('enabled') === 'true';
  const rawModels = String(formData.get('models') ?? '[]');

  let models: string[] = [];
  try {
    const parsed: unknown = JSON.parse(rawModels);
    if (Array.isArray(parsed)) {
      models = parsed.filter(
        (value): value is string => typeof value === 'string',
      );
    }
  } catch {
    models = [];
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      SetAgentModelsEnabledDocument,
      { backend, enabled, models },
    );
    return {
      backend: data.setAgentModelsEnabled.backend,
      enabled: data.setAgentModelsEnabled.enabled,
      errorMessage: null,
    };
  } catch (error) {
    // Report the pre-toggle state so the optimistic UI can revert.
    return {
      backend,
      enabled: !enabled,
      errorMessage:
        error instanceof Error ? error.message : 'Failed to update the models.',
    };
  }
};
