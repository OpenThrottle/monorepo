/**
 * @description The Nest custom provider that builds {@link McpToolsetPrunerService}. It lives
 * beside the service as its own `.provider.ts` so the `.service.ts` exports only the class.
 */

import type { FactoryProvider } from '@nestjs/common';
import { McpRegistryDiscoveryService } from '@rekog/mcp-nest';

import type { ToolsetName } from '../config/toolsets.ts';
import { McpToolsetPrunerService } from './mcp-toolset-pruner.service.ts';

/**
 * @description The Nest provider for a {@link McpToolsetPrunerService} serving `toolsets`. Add it to
 * the module that provides `McpDeveloperMcpSurface` and imports `McpModule.forRoot`.
 * @public
 */
export function mcpToolsetPrunerProvider(
  toolsets: ReadonlySet<ToolsetName>,
): FactoryProvider<McpToolsetPrunerService> {
  return {
    inject: [McpRegistryDiscoveryService],
    provide: McpToolsetPrunerService,
    useFactory: (registry: McpRegistryDiscoveryService) => {
      return new McpToolsetPrunerService(registry, toolsets);
    },
  };
}
