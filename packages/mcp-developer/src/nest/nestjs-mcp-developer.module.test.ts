import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { McpTransportType } from '@rekog/mcp-nest';
import { McpDeveloperMcpSurface } from './mcp-developer-mcp-surface.js';
import { NestjsMcpDeveloperModule } from './nestjs-mcp-developer.module.js';
import { NestjsMcpDeveloperService } from './nestjs-mcp-developer.service.js';

describe('NestjsMcpDeveloperModule', () => {
  describe('forRoot', () => {
    it('registers the MCP surface and Nest service providers', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestjsMcpDeveloperModule.forRoot({
            capabilities: { resources: {}, tools: {} },
            name: 'openthrottle-mcp-developer-test',
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
