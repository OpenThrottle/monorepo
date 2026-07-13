import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import {
  WorkArtifact,
  WorkSession,
  WorkSessionSubject,
  workSessionsFactory,
} from '@openthrottle/nestjs-repositories';
import type { EntityManager, Repository } from 'typeorm';
import { WorkLedgerCaptureService } from './work-ledger-capture.service';

const USER_SUB = 'user-1';
const USER_KIND = 'user';

describe('WorkLedgerCaptureService', () => {
  let sessionRepo: Repository<WorkSession>;
  let subjectRepo: Repository<WorkSessionSubject>;
  let artifactRepo: Repository<WorkArtifact>;
  let manager: EntityManager;
  let cls: GlobalClsService;
  let service: WorkLedgerCaptureService;

  beforeEach(() => {
    sessionRepo = createMock<Repository<WorkSession>>();
    subjectRepo = createMock<Repository<WorkSessionSubject>>();
    artifactRepo = createMock<Repository<WorkArtifact>>();

    vi.mocked(sessionRepo.findOne).mockResolvedValue(null);
    vi.mocked(sessionRepo.save).mockResolvedValue(
      workSessionsFactory.build({ id: 'instant-session' }),
    );
    vi.mocked(subjectRepo.findOne).mockResolvedValue(null);

    manager = createMock<EntityManager>({
      getRepository: vi.fn((target: unknown) => {
        if (target === WorkSession) return sessionRepo;
        if (target === WorkSessionSubject) return subjectRepo;
        return artifactRepo;
      }),
    });

    cls = createMock<GlobalClsService>({
      get: vi.fn().mockReturnValue(undefined),
    });

    service = new WorkLedgerCaptureService(cls);
  });

  const params = {
    actorKind: USER_KIND,
    actorSub: USER_SUB,
    entity: 'task' as const,
    from: 'PENDING',
    id: 'task-1',
    planId: 'plan-1',
    taskId: 'task-1',
    to: 'COMPLETED',
  };

  it('opens an instant session and writes a born-verified status_change when no ambient session', async () => {
    await service.recordStatusChange(manager, params);

    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorServiceAccountId: null,
        actorUserId: USER_SUB,
        closedBy: 'explicit',
        toolName: 'developer-app',
      }),
    );
    expect(artifactRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'instant-session',
        source: 'server',
        type: 'status_change',
        verification: 'verified',
      }),
    );
  });

  it('reuses a valid ambient session whose actor matches the principal', async () => {
    vi.mocked(cls.get).mockReturnValue('ambient-1');
    vi.mocked(sessionRepo.findOne).mockResolvedValue(
      workSessionsFactory.build({
        actorServiceAccountId: null,
        actorUserId: USER_SUB,
        id: 'ambient-1',
      }),
    );

    await service.recordStatusChange(manager, params);

    // Ambient reused → no instant session created.
    expect(sessionRepo.create).not.toHaveBeenCalled();
    expect(artifactRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'ambient-1' }),
    );
  });

  it('ignores a foreign ambient session and falls back to an instant one (no error)', async () => {
    vi.mocked(cls.get).mockReturnValue('ambient-foreign');
    vi.mocked(sessionRepo.findOne).mockResolvedValue(
      workSessionsFactory.build({
        actorServiceAccountId: null,
        actorUserId: 'someone-else',
        id: 'ambient-foreign',
      }),
    );

    await service.recordStatusChange(manager, params);

    expect(sessionRepo.create).toHaveBeenCalledTimes(1);
    expect(artifactRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'instant-session' }),
    );
  });

  it('throws on an unresolved principal (rolls back with the row update)', async () => {
    await expect(
      service.recordStatusChange(manager, {
        ...params,
        actorKind: undefined,
        actorSub: undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(artifactRepo.create).not.toHaveBeenCalled();
  });
});
