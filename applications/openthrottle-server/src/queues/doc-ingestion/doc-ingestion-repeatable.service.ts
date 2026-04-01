/**
 * @description Registers an optional repeatable doc-ingestion job on app bootstrap when DOC_INGESTION_CRON is set.
 * Payload is built from DOC_INGESTION_DIRECTORIES (comma-separated, default "docs") and DOC_INGESTION_SCOPE (default "default").
 * See docs/openthrottle/doc-ingestion-job-spec.md.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import type { Queue } from 'bullmq';
import { DOC_INGESTION_QUEUE_NAME } from './doc-ingestion.constants';
import type {
  DocIngestionJobPayload,
  DocIngestionJobResult,
} from './doc-ingestion.types';

const JOB_NAME = 'doc-ingestion';

/**
 * @description Builds default payload for the repeatable doc-ingestion job from env.
 */
function getDefaultRepeatablePayload(): DocIngestionJobPayload {
  const raw =
    process.env.DOC_INGESTION_DIRECTORIES !== undefined &&
    process.env.DOC_INGESTION_DIRECTORIES !== ''
      ? process.env.DOC_INGESTION_DIRECTORIES
      : 'docs';
  const directories = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const scope =
    process.env.DOC_INGESTION_SCOPE !== undefined &&
    process.env.DOC_INGESTION_SCOPE !== ''
      ? process.env.DOC_INGESTION_SCOPE
      : 'default';
  return { directories, scope };
}

@Injectable()
export class DocIngestionRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(DOC_INGESTION_QUEUE_NAME)
    private readonly queue: Queue<
      DocIngestionJobPayload,
      DocIngestionJobResult
    >,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const cron = process.env.DOC_INGESTION_CRON;
    if (!cron || cron.trim() === '') {
      this.logger.debug(
        'DOC_INGESTION_CRON not set; skipping repeatable doc-ingestion registration.',
        DocIngestionRepeatableService.name,
      );
      return;
    }

    const pattern = cron.trim();
    const payload = getDefaultRepeatablePayload();
    if (
      payload.directories?.length === 0 &&
      (payload.files?.length ?? 0) === 0
    ) {
      this.logger.warn(
        'DOC_INGESTION_CRON set but payload has no directories or files; skipping repeatable doc-ingestion.',
        DocIngestionRepeatableService.name,
      );
      return;
    }

    const job = await this.queue.add(JOB_NAME, payload, {
      repeat: { pattern },
    });
    this.logger.info(
      `Doc-ingestion repeatable job registered: pattern=${pattern}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      DocIngestionRepeatableService.name,
    );
  }
}
