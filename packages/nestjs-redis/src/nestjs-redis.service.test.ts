import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { NestjsRedisService } from './nestjs-redis.service';

describe('NestjsRedisService', () => {
  let service: NestjsRedisService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [NestjsRedisService, LoggerService],
    }).compile();

    service = app.get<NestjsRedisService>(NestjsRedisService);
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual('nestjs-redis says Hello API');
    });
  });
});
