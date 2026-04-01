import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { NestjsPostgresService } from './nestjs-postgres.service';

describe('NestjsPostgresService', () => {
  let service: NestjsPostgresService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsPostgresService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsPostgresService>(NestjsPostgresService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual('nestjs-postgres says Hello API');
    });
  });
});
