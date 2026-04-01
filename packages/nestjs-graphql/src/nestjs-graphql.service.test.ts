import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { createMock } from '@golevelup/ts-vitest';
import { NestjsGraphqlService } from './nestjs-graphql.service';

describe('NestjsGraphqlService', () => {
  let service: NestjsGraphqlService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [LoggerModule],
      providers: [
        NestjsGraphqlService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsGraphqlService>(NestjsGraphqlService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual('nestjs-graphql says Hello API');
    });
  });
});
