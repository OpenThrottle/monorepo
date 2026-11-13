/**
 * @description Serves only the enabled toolsets from the Nest MCP surface, so the HTTP and Nest stdio
 * transports list the same tools as the SDK stdio server (`registerDeveloperMcpTools`).
 *
 * Why prune rather than split {@link McpDeveloperMcpSurface} into one class per toolset: the
 * OpenThrottle server's agents dispatch (`agents-mcp-dispatch.ts`) calls that one class's methods
 * directly, so it has to keep every method. Only what `@rekog/mcp-nest` lists and dispatches is
 * filtered. Its discovery runs in `McpRegistryDiscoveryService.onApplicationBootstrap`; Nest runs
 * bootstrap hooks deepest module first, and `McpModule` is always imported by the module that
 * provides this service, so discovery has finished by the time this hook runs.
 */

import type { OnApplicationBootstrap } from '@nestjs/common';
import type { McpRegistryDiscoveryService } from '@rekog/mcp-nest';

import type { ToolsetName } from '../config/toolsets.ts';
import { developerMcpToolDefinitions } from '../tool-registry.ts';
import { McpDeveloperMcpSurface } from './McpDeveloperMcpSurface.ts';

/**
 * @description Removes every {@link McpDeveloperMcpSurface} tool outside the enabled toolsets from
 * the MCP registry once discovery has run. Built by `mcpToolsetPrunerProvider` (its sibling
 * `.provider.ts`) rather than injected by decorators, so it needs no constructor-parameter
 * decorators.
 * @public
 */
export class McpToolsetPrunerService implements OnApplicationBootstrap {
  private readonly registry: McpRegistryDiscoveryService;
  private readonly toolsets: ReadonlySet<ToolsetName>;

  constructor(
    registry: McpRegistryDiscoveryService,
    toolsets: ReadonlySet<ToolsetName>,
  ) {
    this.registry = registry;
    this.toolsets = toolsets;
  }

  onApplicationBootstrap(): void {
    const toolsetByName = new Map(
      developerMcpToolDefinitions.map((tool) => [tool.name, tool.toolset]),
    );

    for (const moduleId of this.registry.getMcpModuleIds()) {
      for (const tool of this.registry.getTools(moduleId)) {
        const toolset = toolsetByName.get(tool.metadata.name);
        const isOurs = tool.providerClass === McpDeveloperMcpSurface;
        if (isOurs && toolset !== undefined && !this.toolsets.has(toolset)) {
          this.registry.removeDynamicCapability(moduleId, 'tool', tool.methodName); // prettier-ignore
        }
      }
    }
  }
}
