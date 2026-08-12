import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  InstallAgentCliDocument,
  UpdateAgentCliDocument,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.agent-setup';

/** JSON shape returned by the install/update intents (mirrors StartAgentSetupResult). */
export interface AgentSetupActionResult {
  readonly backend: string;
  readonly disabled: boolean;
  readonly errorMessage: string | null;
  readonly mode: string;
  readonly runId: string | null;
}

/**
 * Resource route action backing the /settings/setup install/update controls —
 * `POST /resources/agent-setup`. `intent=update` runs updateAgentCli; anything else runs
 * installAgentCli. Takes only a `backend` id; the server re-validates it against the drivers
 * registry and enforces the SETTINGS_WRITE permission + the OT_AGENT_CLI_INSTALL_ENABLED flag, so a
 * forged post from a user without permission (or with the flag off) is rejected server-side.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<AgentSetupActionResult> => {
  const formData = await args.request.formData();
  const backend = String(formData.get('backend') ?? '');
  const isUpdate = formData.get('intent') === 'update';

  try {
    if (isUpdate) {
      const data = await executeGraphqlWithAuth(
        args.request,
        UpdateAgentCliDocument,
        { backend },
      );
      const result = data.updateAgentCli;
      return {
        backend: result.backend,
        disabled: result.disabled,
        errorMessage: result.errorMessage ?? null,
        mode: result.mode,
        runId: result.runId ?? null,
      };
    }

    const data = await executeGraphqlWithAuth(
      args.request,
      InstallAgentCliDocument,
      { backend },
    );
    const result = data.installAgentCli;
    return {
      backend: result.backend,
      disabled: result.disabled,
      errorMessage: result.errorMessage ?? null,
      mode: result.mode,
      runId: result.runId ?? null,
    };
  } catch (error) {
    return {
      backend,
      disabled: false,
      errorMessage:
        error instanceof Error ? error.message : 'Failed to start the run.',
      mode: isUpdate ? 'update' : 'install',
      runId: null,
    };
  }
};
