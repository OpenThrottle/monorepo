import { createMock } from '@golevelup/ts-vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, describe, expect, test } from 'vitest';

import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';

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
