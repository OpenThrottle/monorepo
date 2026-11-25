import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/resources.agent-models-enabled';
import { SetAgentModelsEnabledDocument } from '~/__generated__/graphql';

/** JSON shape returned by the bulk toggle (mirrors SetAgentModelsEnabledResult + a client error slot). */
export interface AgentModelsEnabledActionResult {
  readonly driver: string;
  readonly enabled: boolean;
  readonly errorMessage: string | null;
}

/**
 * Resource route action backing the /settings/agents per-agent select-all / deselect-all affordance —
 * `POST /resources/agent-models-enabled` with `driver` + `enabled` + a JSON-encoded `models` list.
 * One mutation flips exactly the listed models (every model, or only those a filter shows) at once
 * (vs. one request per model), so a 200-model agent is a single round trip. The server re-validates the driver against the drivers registry and
 * enforces SETTINGS_WRITE. On failure the caller reverts optimistically and surfaces `errorMessage`.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<AgentModelsEnabledActionResult> => {
  const formData = await args.request.formData();
  const driver = String(formData.get('driver') ?? '');
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
      { driver, enabled, models },
    );
    return {
      driver: data.setAgentModelsEnabled.driver,
      enabled: data.setAgentModelsEnabled.enabled,
      errorMessage: null,
    };
  } catch (error) {
    // Report the pre-toggle state so the optimistic UI can revert.
    return {
      driver,
      enabled: !enabled,
      errorMessage:
        error instanceof Error ? error.message : 'Failed to update the models.',
    };
  }
};
