import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { NestjsTypeormService } from './nestjs-typeorm.service';

describe('NestjsTypeormService', () => {
  let service: NestjsTypeormService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsTypeormService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsTypeormService>(NestjsTypeormService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual('nestjs-typeorm says Hello API');
    });
  });
});
