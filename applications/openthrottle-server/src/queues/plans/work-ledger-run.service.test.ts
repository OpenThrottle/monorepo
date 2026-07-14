import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanRunsService,
  ServiceAccountsService,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import type {
  PlanRun,
  ServiceAccount,
  WorkSession,
} from '@openthrottle/nestjs-repositories';
import type { Repository } from 'typeorm';
import { WorkLedgerRunService } from './work-ledger-run.service';

const RALPH_SA_ID = 'ralph-sa-1';
const PLAN_ID = 'plan-1';
const JOB_ID = 'job-1';
const QUEUE = 'plans';

describe('WorkLedgerRunService', () => {
  let sessionRepo: Repository<WorkSession>;
  let subjectRepo: Repository<WorkSession>;
  let workLedgerService: WorkLedgerService;
  let planRunsService: PlanRunsService;
  let serviceAccountsService: ServiceAccountsService;
  let service: WorkLedgerRunService;

  beforeEach(() => {
    sessionRepo = createMock<Repository<WorkSession>>();
    subjectRepo = createMock<Repository<WorkSession>>();
    vi.mocked(sessionRepo.save).mockResolvedValue(
      createMock<WorkSession>({ id: 'session-1' }),
    );

    workLedgerService = createMock<WorkLedgerService>({
      getSessionRepository: vi.fn().mockReturnValue(sessionRepo),
      getSubjectRepository: vi.fn().mockReturnValue(subjectRepo),
    });
    planRunsService = createMock<PlanRunsService>();
    serviceAccountsService = createMock<ServiceAccountsService>();
    vi.mocked(serviceAccountsService.findByName).mockResolvedValue(
      createMock<ServiceAccount>({ id: RALPH_SA_ID }),
    );

    service = new WorkLedgerRunService(
      createMock<LoggerService>(),
      planRunsService,
      serviceAccountsService,
      workLedgerService,
    );
  });

  it('opens a session with the ralph SA actor and verified on_behalf from the plan run', async () => {
    vi.mocked(planRunsService.findByQueueNameAndBullmqJobId).mockResolvedValue(
      createMock<PlanRun>({ actorUserId: 'user-9', id: 'run-1' }),
    );

    const sessionId = await service.openRalphSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    expect(sessionId).toBe('session-1');
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorServiceAccountId: RALPH_SA_ID,
        actorUserId: null,
        externalRef: JOB_ID,
        onBehalfOfUserId: 'user-9',
        onBehalfOfVerified: true,
        planRunId: 'run-1',
        toolName: 'workflow-ralph',
      }),
    );
    expect(subjectRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: PLAN_ID,
        sessionId: 'session-1',
        taskId: null,
      }),
    );
  });

  it('leaves on_behalf unverified when the plan run has no actor user', async () => {
    vi.mocked(planRunsService.findByQueueNameAndBullmqJobId).mockResolvedValue(
      createMock<PlanRun>({ actorUserId: null, id: 'run-2' }),
    );

    await service.openRalphSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        onBehalfOfUserId: null,
        onBehalfOfVerified: false,
      }),
    );
  });

  it('returns null (best-effort) when the ralph service account is missing', async () => {
    vi.mocked(serviceAccountsService.findByName).mockResolvedValue(null);

    const sessionId = await service.openRalphSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    expect(sessionId).toBeNull();
    expect(sessionRepo.save).not.toHaveBeenCalled();
  });

  it('never throws when the ledger write fails', async () => {
    vi.mocked(planRunsService.findByQueueNameAndBullmqJobId).mockResolvedValue(
      createMock<PlanRun>({ actorUserId: 'user-9', id: 'run-1' }),
    );
    vi.mocked(sessionRepo.save).mockRejectedValue(new Error('db down'));

    await expect(
      service.openRalphSession({
        bullmqJobId: JOB_ID,
        planId: PLAN_ID,
        queueName: QUEUE,
      }),
    ).resolves.toBeNull();
  });

  it('closeRalphSession is a no-op for a null id', async () => {
    await service.closeRalphSession(null, 'summary');
    expect(sessionRepo.findOne).not.toHaveBeenCalled();
  });

  it('closeRalphSession stamps a still-open session', async () => {
    vi.mocked(sessionRepo.findOne).mockResolvedValue(
      createMock<WorkSession>({ endedAt: null, id: 'session-1' }),
    );

    await service.closeRalphSession('session-1', 'done');

    expect(sessionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ closedBy: 'explicit', summary: 'done' }),
    );
  });
});
