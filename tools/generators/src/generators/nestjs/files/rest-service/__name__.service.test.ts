import { describe, expect, beforeAll, test } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { <%= namePascal %>Service } from './<%= name %>.service';

describe('<%= namePascal %>Service', () => {
  let service: <%= namePascal %>Service;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [LoggerModule],
      providers: [
        <%= namePascal %>Service,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<<%= namePascal %>Service>(<%= namePascal %>Service);
  });

  describe('getData', () => {
    test('should return "Hello API"', () => {
      expect(service.getData()).toEqual({
        message: 'Hello from <%= namePascal %>Service',
      });
    });
  });
});
