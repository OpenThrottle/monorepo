/**
 * @description Tests for DocIngestionProcessor. Payload validation is unit-tested here;
 * full flow (diff → deindex → ingest → persist) is covered by @tools/workflows/doc-ingestion
 * unit tests and by running the job with Cortex and docs available.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { createMock } from '@golevelup/ts-vitest';
import { DocIngestionProcessor } from './doc-ingestion.processor';
import type { DocIngestionJob } from './doc-ingestion.types';

describe('DocIngestionProcessor', () => {
  let processor: DocIngestionProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocIngestionProcessor,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    processor = module.get(DocIngestionProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should throw when payload has no directories or files', async () => {
    const job = {
      data: { directories: [], files: [] },
      id: 'job-1',
    } as unknown as DocIngestionJob;

    await expect(processor.process(job)).rejects.toThrow(
      'Doc-ingestion job requires at least one of directories or files in the payload.',
    );
  });

  it('should throw when payload has directories undefined and files undefined', async () => {
    const job = {
      data: {},
      id: 'job-1',
    } as DocIngestionJob;

    await expect(processor.process(job)).rejects.toThrow(
      'Doc-ingestion job requires at least one of directories or files in the payload.',
    );
  });
});
