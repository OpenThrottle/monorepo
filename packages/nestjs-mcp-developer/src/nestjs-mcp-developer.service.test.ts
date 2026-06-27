import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { describe, it, expect, beforeAll } from 'vitest';
import * as packageEntry from '@openthrottle/nestjs-openthrottle-mcp';
import {
  McpDeveloperMcpSurface,
  McpTransportType,
  NestjsMcpDeveloperModule,
  NestjsMcpDeveloperService,
  withMcpDeveloperAuthToken,
  withMcpDeveloperAuthTokenAsync,
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

    it('re-exports the request-scoped auth-token wrappers as functions', () => {
      expect(withMcpDeveloperAuthToken).toEqual(expect.any(Function));
      expect(withMcpDeveloperAuthTokenAsync).toEqual(expect.any(Function));
    });

    it('withMcpDeveloperAuthToken runs the provided fn and returns its value', () => {
      const result = withMcpDeveloperAuthToken('token', () => 'ran');

      expect(result).toBe('ran');
    });

    it('withMcpDeveloperAuthTokenAsync awaits and returns the provided fn value', async () => {
      const result = await withMcpDeveloperAuthTokenAsync('token', async () =>
        Promise.resolve('ran-async'),
      );

      expect(result).toBe('ran-async');
    });

    it('resolves the documented public symbols from the package name', () => {
      // Guards the package.json `exports`/dist-vs-src resolution: a stale or
      // mis-pointed `exports` field would drop these re-exports at the package
      // boundary even though the source `index.ts` re-exports them.
      expect(packageEntry).toEqual(
        expect.objectContaining({
          McpDeveloperMcpSurface: expect.any(Function),
          McpTransportType: expect.anything(),
          NestjsMcpDeveloperModule: expect.any(Function),
          NestjsMcpDeveloperService: expect.any(Function),
          bootstrapMcpDeveloperApp: expect.any(Function),
          withMcpDeveloperAuthToken: expect.any(Function),
          withMcpDeveloperAuthTokenAsync: expect.any(Function),
        }),
      );
    });
  });

  describe('NestjsMcpDeveloperModule.forRoot', () => {
    it('composes the Nest module without throwing and wires the providers', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestjsMcpDeveloperModule.forRoot({
            capabilities: { resources: {}, tools: {} },
            name: 'openthrottle-mcp-shim-test',
            transport: McpTransportType.STDIO,
            version: '0.0.0-test',
          }),
        ],
      }).compile();

      expect(moduleRef.get(McpDeveloperMcpSurface)).toBeDefined();
      expect(moduleRef.get(NestjsMcpDeveloperService)).toBeDefined();
    });

    it('defaults the transport to STDIO when none is supplied', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestjsMcpDeveloperModule.forRoot({
            capabilities: { resources: {}, tools: {} },
            name: 'openthrottle-mcp-shim-default-transport',
            version: '0.0.0-test',
          }),
        ],
      }).compile();

      expect(moduleRef.get(McpDeveloperMcpSurface)).toBeDefined();
    });
  });
});
