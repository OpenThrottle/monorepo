import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: vi.fn(),
  executeGraphqlWithAuth: vi.fn(),
}));
import { McpTransportType } from '@rekog/mcp-nest';
import { McpDeveloperMcpSurface } from './openthrottle-mcp-mcp-surface.js';
import { NestjsMcpDeveloperModule } from './nestjs-openthrottle-mcp.module.js';
import { NestjsMcpDeveloperService } from './nestjs-openthrottle-mcp.service.js';

describe('NestjsMcpDeveloperModule', () => {
  describe('forRoot', () => {
    it('registers the MCP surface and Nest service providers', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestjsMcpDeveloperModule.forRoot({
            capabilities: { resources: {}, tools: {} },
            name: 'openthrottle-openthrottle-mcp-test',
            transport: McpTransportType.STDIO,
            version: '0.0.0-test',
          }),
        ],
      }).compile();

      expect(moduleRef.get(McpDeveloperMcpSurface)).toBeDefined();
      expect(moduleRef.get(NestjsMcpDeveloperService)).toBeDefined();
    });
  });
});
