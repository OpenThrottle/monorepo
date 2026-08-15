import type { McpConnectorConnectionFieldsFragment } from '~/__generated__/graphql';

/** Result of the settings.mcp.$connectorId route action, discriminated by shape. */
export type SettingsMcpActionData =
  | { ok: true }
  | { error: string }
  | {
      connection: McpConnectorConnectionFieldsFragment;
      intent: 'connect';
    };
