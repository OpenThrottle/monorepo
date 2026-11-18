import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSession,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  WorkArtifactsRepositoryMock,
  WorkSessionsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createWorkArtifactsRepositoryMock,
  createWorkSessionsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WorkLedgerSweepProcessor } from './work-ledger-sweep.processor.ts';
import type { WorkLedgerSweepJob } from './work-ledger-sweep.types.ts';

describe('WorkLedgerSweepProcessor', () => {
  let sessionRepo: WorkSessionsRepositoryMock;
  let artifactRepo: WorkArtifactsRepositoryMock;
  let processor: WorkLedgerSweepProcessor;

  const job = createMock<WorkLedgerSweepJob>({ id: 'sweep-1' });
  const startedAt = new Date('2026-07-01T00:00:00Z');
  const lastArtifactAt = new Date('2026-07-01T02:00:00Z');

  beforeEach(() => {
    sessionRepo = createWorkSessionsRepositoryMock();
    artifactRepo = createWorkArtifactsRepositoryMock();
    processor = new WorkLedgerSweepProcessor(
      createMock<LoggerService>(),
      createMock<WorkArtifactsRepository>(artifactRepo),
      createMock<WorkSessionsRepository>(sessionRepo),
    );
  });

  it('closes an abandoned session, dating it from the last artifact, closed_by=sweeper', async () => {
    sessionRepo.findBy.mockResolvedValue([
      createMock<WorkSession>({ endedAt: null, id: 'sess-1', startedAt }),
    ]);
    artifactRepo.findOne.mockResolvedValue(
      createMock<WorkArtifact>({ producedAt: lastArtifactAt }),
    );

    await processor.process(job);

    expect(sessionRepo.close).toHaveBeenCalledWith('sess-1', {
      closedBy: 'sweeper',
      endedAt: lastArtifactAt,
      summary: null,
    });
  });

  it('falls back to started_at when the session has no artifacts', async () => {
    sessionRepo.findBy.mockResolvedValue([
      createMock<WorkSession>({ endedAt: null, id: 'sess-2', startedAt }),
    ]);
    artifactRepo.findOne.mockResolvedValue(null);

    await processor.process(job);

    expect(sessionRepo.close).toHaveBeenCalledWith('sess-2', {
      closedBy: 'sweeper',
      endedAt: startedAt,
      summary: null,
    });
  });

  it('queries only open sessions and no-ops when none are abandoned', async () => {
    sessionRepo.findBy.mockResolvedValue([]);

    await processor.process(job);

    // The find filters on endedAt IS NULL + startedAt < cutoff.
    const findArg = sessionRepo.findBy.mock.calls[0]?.[0];
    expect(findArg?.where).toMatchObject({
      endedAt: expect.anything(),
      startedAt: expect.anything(),
    });
    expect(sessionRepo.close).not.toHaveBeenCalled();
  });
});
