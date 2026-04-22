import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { NestjsAgenticWorkflowService } from './nestjs-agentic-workflow.service';

describe('NestjsAgenticWorkflowService', () => {
  let service: NestjsAgenticWorkflowService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NestjsAgenticWorkflowService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = app.get<NestjsAgenticWorkflowService>(
      NestjsAgenticWorkflowService,
    );
  });

  describe('exampleMethod', () => {
    it('should return a simple string', () => {
      expect(service.exampleMethod()).toEqual(
        'nestjs-agentic-workflow says Hello API',
      );
    });
  });
});
