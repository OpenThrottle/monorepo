import {
  coerceBoolean,
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';

import type { Route } from '@/app/routes/+types/settings.mcp.$connectorId';
import {
  ConnectMcpConnectorDocument,
  DisconnectMcpConnectorDocument,
  SetMcpConnectorEnabledDocument,
} from '~/__generated__/graphql';
import { ConnectMcpConnectorInputSchema } from '~/__generated__/schemas';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import type { SettingsMcpActionData } from '~/routing/settings/utils/settings-mcp-action';

export const runMcpConnectorAction = async (
  args: Route.ActionArgs,
): Promise<SettingsMcpActionData> => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');
  const connectorParsed = parseFormData(
    formData,
    z.object({ connectorKey: z.string().min(1) }),
    { strict: false },
  );

  if (!connectorParsed.success) {
    return { error: 'Connector is required.' };
  }
  const connectorKey = connectorParsed.data.connectorKey;

  if (intent === 'connect') {
    const parsed = parseFormData(
      formData,
      ConnectMcpConnectorInputSchema().omit({ connectorKey: true }),
      { strict: false },
    );
    if (!parsed.success) {
      return { error: parsed.error };
    }

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        ConnectMcpConnectorDocument,
        {
          input: {
            apiToken: parsed.data.apiToken ?? null,
            connectorKey,
            label: parsed.data.label ?? null,
          },
        },
      );
      return {
        connection: data.connectMcpConnector.connection,
        intent: 'connect',
      };
    } catch (error) {
      return { error: toErrorMessage(error, 'Failed to connect.') };
    }
  }

  if (intent === 'setEnabled') {
    const enabledParsed = parseFormData(
      formData,
      z.object({ enabled: coerceBoolean(z.boolean()).nullish() }),
      { strict: false },
    );
    const enabled = enabledParsed.success
      ? (enabledParsed.data.enabled ?? false)
      : false;
    try {
      await executeGraphqlWithAuth(
        args.request,
        SetMcpConnectorEnabledDocument,
        { input: { connectorKey, enabled } },
      );
      return { ok: true };
    } catch (error) {
      return { error: toErrorMessage(error, 'Failed to update connection.') };
    }
  }

  if (intent === 'disconnect') {
    try {
      await executeGraphqlWithAuth(
        args.request,
        DisconnectMcpConnectorDocument,
        { connectorKey },
      );
      return { ok: true };
    } catch (error) {
      return { error: toErrorMessage(error, 'Failed to disconnect.') };
    }
  }

  throw new Error('Invalid intent');
};
