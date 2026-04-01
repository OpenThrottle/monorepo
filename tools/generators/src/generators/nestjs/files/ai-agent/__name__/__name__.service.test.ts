import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { <%= namePascal %>Service } from './<%= name %>.service';

describe('<%= namePascal %>Service', () => {
  let service: <%= namePascal %>Service;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        <%= namePascal %>Service,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
      ],
    }).compile();

    service = app.get<<%= namePascal %>Service>(<%= namePascal %>Service);
  });

  describe('exampleTool', () => {
    it('should be defined', () => {
      expect(service.exampleTool).toBeDefined();
      expect(service.invoke).toBeDefined();
    });

    it('should be callable', () => {
      const tool = service.exampleTool();

      expect(tool.invoke({ city: 'San Francisco' })).resolves.toEqual(
        "It's always sunny in San Francisco!",
      );
    });
  });
});
