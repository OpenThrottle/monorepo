import type { McpOptions, McpTransportType } from '@rekog/mcp-nest';

import type { ToolsetName } from '../config/toolsets.ts';

type McpBootstrapBase = Pick<
  McpOptions,
  | 'apiPrefix'
  | 'capabilities'
  | 'description'
  | 'instructions'
  | 'name'
  | 'title'
  | 'version'
>;

/**
 * @description Options for {@link NestjsMcpDeveloperModule.forRoot}; wraps {@link McpOptions} with a default of {@link McpTransportType.STDIO} when `transport` is omitted.
 */
export interface NestjsMcpDeveloperBootstrapOptions extends McpBootstrapBase {
  /** Toolsets to serve. Omitted means resolve from `--toolsets` / `OPENTHROTTLE_MCP_TOOLSETS`, which defaults to `core`. */
  readonly toolsets?: ReadonlySet<ToolsetName>;
  readonly transport?: McpTransportType | McpTransportType[];
}
