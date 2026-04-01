import { describe, it, expect, beforeAll } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { NestjsBullmqService } from './nestjs-bullmq.service';

describe('NestjsBullmqService', () => {
  let service: NestjsBullmqService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [LoggerModule],
      providers: [
        NestjsBullmqService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsBullmqService>(NestjsBullmqService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual('nestjs-bullmq says Hello API');
    });
  });
});
