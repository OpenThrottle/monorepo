import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  WORK_SESSION_CLOSED_BY,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import { IsNull, LessThan } from 'typeorm';
import {
  WORK_LEDGER_SWEEP_BATCH_SIZE,
  WORK_LEDGER_SWEEP_QUEUE_NAME,
  WORK_LEDGER_SWEEP_TTL_HOURS,
} from './work-ledger-sweep.constants';
import type {
  WorkLedgerSweepJob,
  WorkLedgerSweepSummary,
} from './work-ledger-sweep.types';

const CONCURRENCY = 1;
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * @description Abandoned-session sweeper (design §4.4, G6). Hourly, it closes work sessions that
 * are still open past the TTL — a crashed/killed producer that never called endWorkSession. It
 * stamps ended_at from the session's last artifact (or started_at if artifact-less) and
 * closed_by='sweeper', which distinguishes "ran to completion" (explicit) from "process died"
 * (sweeper) as a reliability signal. PURE HYGIENE: it writes no verification/lifecycle state.
 * Idempotent — only open, past-TTL sessions match, and a closed session is never reopened.
 */
@Processor(WORK_LEDGER_SWEEP_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class WorkLedgerSweepProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly workLedgerService: WorkLedgerService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Work-ledger sweep worker started (concurrency=${CONCURRENCY})`,
      WorkLedgerSweepProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Work-ledger sweep worker shutting down (signal=${signal ?? 'unknown'})`,
      WorkLedgerSweepProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: WorkLedgerSweepJob): Promise<void> {
    this.logger.info(
      `Work-ledger sweep started: jobId=${job.id}`,
      WorkLedgerSweepProcessor.name,
    );

    const summary = await this.sweepAbandonedSessions();

    this.logger.info(
      `Work-ledger sweep done: examined=${summary.examined}, swept=${summary.swept}`,
      WorkLedgerSweepProcessor.name,
    );
  }

  private async sweepAbandonedSessions(): Promise<WorkLedgerSweepSummary> {
    const cutoff = new Date(
      Date.now() - WORK_LEDGER_SWEEP_TTL_HOURS * MS_PER_HOUR,
    );
    const sessionRepo = this.workLedgerService.getSessionRepository();
    const artifactRepo = this.workLedgerService.getArtifactRepository();

    const sessions = await sessionRepo.find({
      order: { startedAt: 'ASC' },
      take: WORK_LEDGER_SWEEP_BATCH_SIZE,
      where: { endedAt: IsNull(), startedAt: LessThan(cutoff) },
    });

    let swept = 0;

    for (const session of sessions) {
      // eslint-disable-next-line no-await-in-loop -- sequential DB writes, one abandoned session at a time
      const lastArtifact = await artifactRepo.findOne({
        order: { producedAt: 'DESC' },
        where: { sessionId: session.id },
      });

      session.endedAt = lastArtifact?.producedAt ?? session.startedAt;
      session.closedBy = WORK_SESSION_CLOSED_BY.SWEEPER;
      // eslint-disable-next-line no-await-in-loop -- sequential DB writes, one abandoned session at a time
      await sessionRepo.save(session);
      swept += 1;
    }

    return { examined: sessions.length, swept };
  }
}
