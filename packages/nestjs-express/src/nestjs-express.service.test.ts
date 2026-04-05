import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { NestjsExpressService } from './nestjs-express.service';

describe('NestjsExpressService', () => {
  let service: NestjsExpressService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsExpressService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsExpressService>(NestjsExpressService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual('nestjs-express says Hello API');
    });
  });
});
