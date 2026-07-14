import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { WorkLedgerService } from '@openthrottle/nestjs-repositories';
import type {
  WorkArtifact,
  WorkSession,
} from '@openthrottle/nestjs-repositories';
import type { Repository } from 'typeorm';
import { WorkLedgerSweepProcessor } from './work-ledger-sweep.processor';
import type { WorkLedgerSweepJob } from './work-ledger-sweep.types';

describe('WorkLedgerSweepProcessor', () => {
  let sessionRepo: Repository<WorkSession>;
  let artifactRepo: Repository<WorkArtifact>;
  let workLedgerService: WorkLedgerService;
  let processor: WorkLedgerSweepProcessor;

  const job = createMock<WorkLedgerSweepJob>({ id: 'sweep-1' });
  const startedAt = new Date('2026-07-01T00:00:00Z');
  const lastArtifactAt = new Date('2026-07-01T02:00:00Z');

  beforeEach(() => {
    sessionRepo = createMock<Repository<WorkSession>>();
    artifactRepo = createMock<Repository<WorkArtifact>>();
    workLedgerService = createMock<WorkLedgerService>({
      getArtifactRepository: vi.fn().mockReturnValue(artifactRepo),
      getSessionRepository: vi.fn().mockReturnValue(sessionRepo),
    });
    processor = new WorkLedgerSweepProcessor(
      createMock<LoggerService>(),
      workLedgerService,
    );
  });

  it('closes an abandoned session, dating it from the last artifact, closed_by=sweeper', async () => {
    vi.mocked(sessionRepo.find).mockResolvedValue([
      createMock<WorkSession>({ endedAt: null, id: 'sess-1', startedAt }),
    ]);
    vi.mocked(artifactRepo.findOne).mockResolvedValue(
      createMock<WorkArtifact>({ producedAt: lastArtifactAt }),
    );

    await processor.process(job);

    expect(sessionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        closedBy: 'sweeper',
        endedAt: lastArtifactAt,
        id: 'sess-1',
      }),
    );
  });

  it('falls back to started_at when the session has no artifacts', async () => {
    vi.mocked(sessionRepo.find).mockResolvedValue([
      createMock<WorkSession>({ endedAt: null, id: 'sess-2', startedAt }),
    ]);
    vi.mocked(artifactRepo.findOne).mockResolvedValue(null);

    await processor.process(job);

    expect(sessionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ closedBy: 'sweeper', endedAt: startedAt }),
    );
  });

  it('queries only open sessions and no-ops when none are abandoned', async () => {
    vi.mocked(sessionRepo.find).mockResolvedValue([]);

    await processor.process(job);

    // The find filters on endedAt IS NULL + startedAt < cutoff.
    const findArg = vi.mocked(sessionRepo.find).mock.calls[0]?.[0];
    expect(findArg?.where).toMatchObject({
      endedAt: expect.anything(),
      startedAt: expect.anything(),
    });
    expect(sessionRepo.save).not.toHaveBeenCalled();
  });
});
