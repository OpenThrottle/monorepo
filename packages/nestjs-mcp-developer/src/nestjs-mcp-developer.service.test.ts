import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { NestjsMcpDeveloperService } from './nestjs-mcp-developer.service';

describe('NestjsMcpDeveloperService', () => {
  let service: NestjsMcpDeveloperService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsMcpDeveloperService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsMcpDeveloperService>(NestjsMcpDeveloperService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual(
        'nestjs-mcp-developer says Hello API',
      );
    });
  });
});
