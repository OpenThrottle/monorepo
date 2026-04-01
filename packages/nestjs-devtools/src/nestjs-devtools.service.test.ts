import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { createMock } from '@golevelup/ts-vitest';
import { NestjsDevtoolsService } from './nestjs-devtools.service';

describe('NestjsDevtoolsService', () => {
  let service: NestjsDevtoolsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsDevtoolsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsDevtoolsService>(NestjsDevtoolsService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual('nestjs-devtools says Hello API');
    });
  });
});
