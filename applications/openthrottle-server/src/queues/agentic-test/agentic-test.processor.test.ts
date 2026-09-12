import { createMock } from '@golevelup/ts-vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgenticTestProcessor } from './agentic-test.processor';
import type { AgenticTestJob } from './agentic-test.types';
import * as agenticTestEcho from './agentic-test-echo';

describe('AgenticTestProcessor', () => {
  let processor: AgenticTestProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgenticTestProcessor,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    processor = module.get(AgenticTestProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('delegates to runAgenticTestEchoLoop and returns its result', async () => {
    const echoResult = {
      echoedCount: 2,
      timestamps: ['2026-06-01T00:00:00.000Z', '2026-06-01T00:00:01.000Z'],
    };
    const runSpy = vi
      .spyOn(agenticTestEcho, 'runAgenticTestEchoLoop')
      .mockResolvedValue(echoResult);

    const job = createMock<AgenticTestJob>({
      data: { label: 'smoke' },
      id: 'job-1',
    });

    const result = await processor.process(job);

    expect(runSpy).toHaveBeenCalledOnce();
    expect(result).toEqual(echoResult);
    runSpy.mockRestore();
  });
});
