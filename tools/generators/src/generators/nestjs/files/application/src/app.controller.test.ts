import { describe, expect, beforeAll, test } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { createMock } from '@golevelup/ts-vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      exports: [],
      imports: [LoggerModule],
      providers: [
        {
          provide: AppService,
          useValue: createMock<AppService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();
  });

  describe('index route', () => {
    test('should return "example"', () => {
      const appController = app.get<AppController>(AppController);

      expect(appController.index).toBeDefined();
    });
  });
});
