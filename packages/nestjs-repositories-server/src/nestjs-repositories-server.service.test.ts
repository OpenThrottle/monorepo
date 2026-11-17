import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, describe, expect, it } from 'vitest';

import { NestjsRepositoriesServerService } from './nestjs-repositories-server.service.ts';

describe('NestjsRepositoriesServerService', () => {
  let service: NestjsRepositoriesServerService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsRepositoriesServerService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsRepositoriesServerService>(
      NestjsRepositoriesServerService,
    );
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual(
        'nestjs-repositories-server says Hello API',
      );
    });
  });
});
