import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
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
    // Default: no worker token configured → actor resolution falls back to findByName.
    // Individual tests stub a token to exercise the token-principal path.
    vi.stubEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', '');
    vi.stubEnv('OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN', '');
    vi.stubEnv('OPENTHROTTLE_MCP_AUTH_TOKEN', '');

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

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it('actors the session to the worker token principal so it matches the request principal (G11)', async () => {
    vi.stubEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', 'ot_sa_worker_token');
    vi.mocked(planRunsService.findByQueueNameAndBullmqJobId).mockResolvedValue(
      createMock<PlanRun>({ actorUserId: 'user-9', id: 'run-1' }),
    );
    vi.mocked(serviceAccountsService.verifyBearerToken).mockResolvedValue({
      credentialId: 'cred-1',
      serviceAccountId: 'principal-sa',
    });

    await service.openRalphSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    // Actor is the token's principal, NOT the name-lookup SA.
    expect(serviceAccountsService.verifyBearerToken).toHaveBeenCalledWith(
      'ot_sa_worker_token',
    );
    expect(serviceAccountsService.findByName).not.toHaveBeenCalled();
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorServiceAccountId: 'principal-sa' }),
    );
  });

  it('falls back to the workflow-ralph SA by name when the worker token does not verify', async () => {
    vi.stubEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', 'ot_sa_bad_token');
    vi.mocked(planRunsService.findByQueueNameAndBullmqJobId).mockResolvedValue(
      createMock<PlanRun>({ actorUserId: null, id: 'run-3' }),
    );
    vi.mocked(serviceAccountsService.verifyBearerToken).mockResolvedValue(null);

    await service.openRalphSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    expect(serviceAccountsService.findByName).toHaveBeenCalledWith(
      'workflow-ralph',
    );
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorServiceAccountId: RALPH_SA_ID }),
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
