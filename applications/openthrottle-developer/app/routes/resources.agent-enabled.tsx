import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { SetAgentEnabledDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.agent-enabled';

/** JSON shape returned by the toggle (mirrors SetAgentEnabledResult + a client error slot). */
export interface AgentEnabledActionResult {
  readonly backend: string;
  readonly enabled: boolean;
  readonly errorMessage: string | null;
}

/**
 * Resource route action backing the /settings/setup per-agent enable/disable toggle —
 * `POST /resources/agent-enabled` with `backend` + `enabled` fields. The server re-validates the
 * backend against the drivers registry and enforces the SETTINGS_WRITE permission, so a forged post
 * from a user without permission is rejected server-side. On failure the caller reverts optimistically
 * and surfaces `errorMessage`.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<AgentEnabledActionResult> => {
  const formData = await args.request.formData();
  const backend = String(formData.get('backend') ?? '');
  const enabled = formData.get('enabled') === 'true';

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      SetAgentEnabledDocument,
      { backend, enabled },
    );
    return {
      backend: data.setAgentEnabled.backend,
      enabled: data.setAgentEnabled.enabled,
      errorMessage: null,
    };
  } catch (error) {
    // Report the pre-toggle state so the optimistic UI can revert.
    return {
      backend,
      enabled: !enabled,
      errorMessage:
        error instanceof Error ? error.message : 'Failed to update the agent.',
    };
  }
};
