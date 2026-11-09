import type { McpConnectorAuthType } from './mcp-connector-connection.entity.ts';
/** Input for {@link McpConnectorsService.connect}. */
export type ConnectMcpConnectorInput = {
  readonly apiToken?: string | null;
  readonly authType: McpConnectorAuthType;
  readonly connectorKey: string;
  readonly label?: string | null;
  readonly userId: string;
};
