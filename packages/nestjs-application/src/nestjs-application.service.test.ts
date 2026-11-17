import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, describe, expect, it } from 'vitest';

import { NestjsApplicationService } from './nestjs-application.service.ts';

describe('NestjsApplicationService', () => {
  let service: NestjsApplicationService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsApplicationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsApplicationService>(NestjsApplicationService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual(
        'nestjs-application says Hello API',
      );
    });
  });
});
