import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import type { McpOptions } from '@rekog/mcp-nest';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';

import {
  enabledToolsetsFromProcess,
  setActiveToolsets,
} from '../config/toolsets.ts';
import { mcpToolsetPrunerProvider } from './mcp-toolset-pruner.provider.ts';
import { McpDeveloperMcpSurface } from './McpDeveloperMcpSurface.ts';
import { NestjsMcpDeveloperService } from './nestjs-openthrottle-mcp.service.ts';
import type { NestjsMcpDeveloperBootstrapOptions } from './nestjs-openthrottle-mcp-bootstrap-options.interface.ts';

const buildMcpRootOptions = (
  options: NestjsMcpDeveloperBootstrapOptions,
): McpOptions => {
  return {
    apiPrefix: options.apiPrefix,
    capabilities: options.capabilities,
    description: options.description,
    instructions: options.instructions,
    name: options.name,
    title: options.title,
    transport: options.transport ?? McpTransportType.STDIO,
    version: options.version,
  };
};

/**
 * @description OpenThrottle Nest module that composes {@link LoggerModule} and `@rekog/mcp-nest` {@link McpModule} for the developer MCP surface.
 */
@Module({})
export class NestjsMcpDeveloperModule {
  /**
   * @description Registers structured logging and MCP server wiring. Defaults to STDIO; set `transport` for SSE or streamable HTTP when hosting in-process. Serves only `options.toolsets` (default: resolved from the process, which is `core` unless configured).
   */
  static forRoot(options: NestjsMcpDeveloperBootstrapOptions): DynamicModule {
    const toolsets = options.toolsets ?? enabledToolsetsFromProcess();
    setActiveToolsets(toolsets);

    return {
      exports: [McpModule, McpDeveloperMcpSurface, NestjsMcpDeveloperService],
      imports: [
        LoggerModule,
        // No McpModule.forFeature: McpDeveloperMcpSurface is a provider of this module, which
        // imports McpModule.forRoot, so rekog's subtree scan already finds it. Registering it again
        // via forFeature listed every tool twice in tools/list.
        McpModule.forRoot(buildMcpRootOptions(options)),
      ],
      module: NestjsMcpDeveloperModule,
      providers: [
        McpDeveloperMcpSurface,
        mcpToolsetPrunerProvider(toolsets),
        NestjsMcpDeveloperService,
      ],
    };
  }
}
