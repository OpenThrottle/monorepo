import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { createMock } from '@golevelup/ts-vitest';
import { NestjsBullmqBoardService } from './nestjs-bullmq-board.service';

describe('NestjsBullmqBoardService', () => {
  let service: NestjsBullmqBoardService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsBullmqBoardService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsBullmqBoardService>(NestjsBullmqBoardService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual(
        'nestjs-bullmq-board says Hello API',
      );
    });
  });
});
