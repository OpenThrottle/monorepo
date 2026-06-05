import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  McpDeveloperMcpSurface,
  NestjsMcpDeveloperService,
} from '@openthrottle/nestjs-openthrottle-mcp';

describe('NestjsMcpDeveloperService', () => {
  let service: NestjsMcpDeveloperService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        McpDeveloperMcpSurface,
        NestjsMcpDeveloperService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsMcpDeveloperService>(NestjsMcpDeveloperService);
  });

  describe('constructor', () => {
    it('should resolve the service', () => {
      expect(service).toBeDefined();
    });
  });

  describe('re-export surface', () => {
    it('exposes the shared MCP tool surface from openthrottle-mcp/nest', async () => {
      const app = await Test.createTestingModule({
        imports: [],
        providers: [
          McpDeveloperMcpSurface,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
        ],
      }).compile();

      const surface = app.get(McpDeveloperMcpSurface);
      expect(surface.health).toEqual(expect.any(Function));
    });
  });
});
