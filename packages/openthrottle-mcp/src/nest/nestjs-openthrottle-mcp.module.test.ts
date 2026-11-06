import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: vi.fn(),
  executeGraphqlWithAuth: vi.fn(),
}));
import { McpRegistryDiscoveryService, McpTransportType } from '@rekog/mcp-nest';

import type { ToolsetName } from '../config/toolsets.ts';
import { DEFAULT_TOOLSETS, TOOLSET_NAMES } from '../config/toolsets.ts';
import { developerMcpToolsIn } from '../tool-registry.ts';
import { NestjsMcpDeveloperModule } from './nestjs-openthrottle-mcp.module.ts';
import { NestjsMcpDeveloperService } from './nestjs-openthrottle-mcp.service.ts';
import { McpDeveloperMcpSurface } from './openthrottle-mcp-mcp-surface.ts';

const BASE_OPTIONS = {
  capabilities: { resources: {}, tools: {} },
  name: 'openthrottle-mcp-test',
  transport: McpTransportType.STREAMABLE_HTTP,
  version: '0.0.0-test',
};

/**
 * @description Boots the module and returns the tool names `@rekog/mcp-nest` will list, after every
 * bootstrap hook (discovery, then pruning) has run.
 */
const bootListedToolNames = async (
  toolsets: ReadonlySet<ToolsetName> | undefined,
  track: (app: INestApplication) => void,
): Promise<string[]> => {
  const moduleRef = await Test.createTestingModule({
    imports: [NestjsMcpDeveloperModule.forRoot({ ...BASE_OPTIONS, toolsets })],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  track(app);
  await app.init();

  const registry = app.get(McpRegistryDiscoveryService);

  return registry
    .getMcpModuleIds()
    .flatMap((id) => registry.getTools(id).map((tool) => tool.metadata.name))
    .sort();
};

const namesIn = (toolsets: readonly ToolsetName[]): string[] => {
  return developerMcpToolsIn(new Set(toolsets))
    .map((tool) => tool.name)
    .sort();
};

describe('NestjsMcpDeveloperModule', () => {
  const apps: INestApplication[] = [];
  const track = (app: INestApplication): void => {
    apps.push(app);
  };

  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  describe('forRoot', () => {
    it('registers the MCP surface and Nest service providers', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestjsMcpDeveloperModule.forRoot({
            ...BASE_OPTIONS,
            transport: McpTransportType.STDIO,
          }),
        ],
      }).compile();

      expect(moduleRef.get(McpDeveloperMcpSurface)).toBeDefined();
      expect(moduleRef.get(NestjsMcpDeveloperService)).toBeDefined();
    });
  });

  describe('when no toolsets are configured', () => {
    it('lists only the default toolsets, as the stdio server does', async () => {
      vi.stubEnv('OPENTHROTTLE_MCP_TOOLSETS', '');

      expect(await bootListedToolNames(undefined, track)).toEqual(
        namesIn(DEFAULT_TOOLSETS),
      );
    });
  });

  describe('when toolsets are passed', () => {
    it('lists exactly those toolsets', async () => {
      const toolsets: ToolsetName[] = ['blog', 'core'];

      expect(await bootListedToolNames(new Set(toolsets), track)).toEqual(
        namesIn(toolsets),
      );
    });

    it('lists every tool for all toolsets', async () => {
      expect(await bootListedToolNames(new Set(TOOLSET_NAMES), track)).toEqual(
        namesIn(TOOLSET_NAMES),
      );
    });
  });
});
