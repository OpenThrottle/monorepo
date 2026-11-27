import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';

import { REPEATABLE_JOB_OPTIONS } from '../../repeatable-job/repeatable-job.options.ts';
import { resolveRepeatablesOwner } from '../../repeatable-job/repeatable-job.utils.ts';
import { ATTACHMENTS_JANITOR_QUEUE_NAME } from '../attachments-janitor.constants.ts';
import type { AttachmentsJanitorJobData } from '../attachments-janitor.types.ts';

/** @description Cron pattern: daily at 03:30 (sec min hour day month dow). */
const CRON_PATTERN = '0 30 3 * * *';

const JOB_NAME = 'Clean Up Chat Attachments';

/**
 * @description Registers the repeatable attachments cleanup on boot — owner-only, because it
 * deletes files from the user's real attachments root (see `repeatable-job.types.ts`).
 */
@Injectable()
export class AttachmentsJanitorRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(ATTACHMENTS_JANITOR_QUEUE_NAME)
    private readonly queue: Queue<AttachmentsJanitorJobData, void>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const ownership = resolveRepeatablesOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Attachments janitor repeatable job not registered: ${ownership.reason}`,
        AttachmentsJanitorRepeatableService.name,
      );
      return;
    }

    const job = await this.queue.add(
      JOB_NAME,
      {},
      { ...REPEATABLE_JOB_OPTIONS, repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Attachments janitor repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      AttachmentsJanitorRepeatableService.name,
    );
  }
}
