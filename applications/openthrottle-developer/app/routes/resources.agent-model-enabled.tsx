import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { SetAgentModelEnabledDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.agent-model-enabled';

/** JSON shape returned by the toggle (mirrors SetAgentModelEnabledResult + a client error slot). */
export interface AgentModelEnabledActionResult {
  readonly backend: string;
  readonly enabled: boolean;
  readonly errorMessage: string | null;
  readonly model: string;
}

/**
 * Resource route action backing the /settings/setup per-MODEL enable/disable toggle —
 * `POST /resources/agent-model-enabled` with `backend` + `model` + `enabled` fields. The server
 * re-validates the backend against the drivers registry and enforces the SETTINGS_WRITE permission,
 * so a forged post from a user without permission is rejected server-side. On failure the caller
 * reverts optimistically and surfaces `errorMessage`.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<AgentModelEnabledActionResult> => {
  const formData = await args.request.formData();
  const backend = String(formData.get('backend') ?? '');
  const model = String(formData.get('model') ?? '');
  const enabled = formData.get('enabled') === 'true';

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      SetAgentModelEnabledDocument,
      { backend, enabled, model },
    );
    return {
      backend: data.setAgentModelEnabled.backend,
      enabled: data.setAgentModelEnabled.enabled,
      errorMessage: null,
      model: data.setAgentModelEnabled.model,
    };
  } catch (error) {
    // Report the pre-toggle state so the optimistic UI can revert.
    return {
      backend,
      enabled: !enabled,
      errorMessage:
        error instanceof Error ? error.message : 'Failed to update the model.',
      model,
    };
  }
};
