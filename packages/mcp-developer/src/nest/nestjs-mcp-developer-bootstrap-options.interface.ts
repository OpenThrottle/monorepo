import type { McpOptions, McpTransportType } from '@rekog/mcp-nest';

type McpBootstrapBase = Pick<
  McpOptions,
  'capabilities' | 'description' | 'instructions' | 'name' | 'title' | 'version'
>;

/**
 * @description Options for {@link NestjsMcpDeveloperModule.forRoot}; wraps {@link McpOptions} with a default of {@link McpTransportType.STDIO} when `transport` is omitted.
 */
export interface NestjsMcpDeveloperBootstrapOptions extends McpBootstrapBase {
  readonly transport?: McpTransportType | McpTransportType[];
}
