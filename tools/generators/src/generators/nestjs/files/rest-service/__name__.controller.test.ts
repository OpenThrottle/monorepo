import { describe, expect, beforeAll, test } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { <%= namePascal %>Controller } from './<%= name %>.controller';
import { <%= namePascal %>Service } from './<%= name %>.service';

describe('Controller', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [<%= namePascal %>Controller],
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
  });

  describe('getData', () => {
    test('should return "Hello API"', () => {
      const controller = app.get<<%= namePascal %>Controller>(<%= namePascal %>Controller);

      expect(controller.getData()).toEqual({
        message: 'Hello from <%= namePascal %>Service',
      });
    });
  });
});
