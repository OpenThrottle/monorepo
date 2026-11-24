import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRun,
  PlanRunsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  ServiceAccountCredentialsRepository,
  ServiceAccountsRepository,
  WorkSession,
  WorkSessionsRepository,
  WorkSessionSubject,
  WorkSessionSubjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  PlanRunsRepositoryMock,
  ServiceAccountCredentialsRepositoryMock,
  ServiceAccountsRepositoryMock,
  WorkSessionsRepositoryMock,
  WorkSessionSubjectsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlanRunsRepositoryMock,
  createServiceAccountCredentialsRepositoryMock,
  createServiceAccountsRepositoryMock,
  createWorkSessionsRepositoryMock,
  createWorkSessionSubjectsRepositoryMock,
  serviceAccountsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkLedgerRunService } from './work-ledger-run.service.ts';

const PLAN_RUNNER_SA_ID = 'plan-runner-sa-1';
const PLAN_ID = 'plan-1';
const JOB_ID = 'job-1';
const QUEUE = 'plans';

describe('WorkLedgerRunService', () => {
  let sessionRepo: WorkSessionsRepositoryMock;
  let subjectRepo: WorkSessionSubjectsRepositoryMock;
  let planRunsRepository: PlanRunsRepositoryMock;
  let credentials: ServiceAccountCredentialsRepositoryMock;
  let serviceAccounts: ServiceAccountsRepositoryMock;
  let service: WorkLedgerRunService;

  beforeEach(() => {
    // Default: no worker token configured → actor resolution falls back to findByName.
    // Individual tests stub a token to exercise the token-principal path.
    vi.stubEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', '');
    vi.stubEnv('OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN', '');
    vi.stubEnv('OPENTHROTTLE_MCP_AUTH_TOKEN', '');

    sessionRepo = createWorkSessionsRepositoryMock();
    subjectRepo = createWorkSessionSubjectsRepositoryMock();
    sessionRepo.create.mockResolvedValue(
      createMock<WorkSession>({ id: 'session-1' }),
    );
    subjectRepo.create.mockResolvedValue(createMock<WorkSessionSubject>());
    planRunsRepository = createPlanRunsRepositoryMock();
    credentials = createServiceAccountCredentialsRepositoryMock();
    serviceAccounts = createServiceAccountsRepositoryMock();
    serviceAccounts.findByName.mockResolvedValue(
      serviceAccountsFactory.build({ id: PLAN_RUNNER_SA_ID }),
    );

    service = new WorkLedgerRunService(
      createMock<LoggerService>(),
      createMock<PlanRunsRepository>(planRunsRepository),
      createMock<ServiceAccountCredentialsRepository>(credentials),
      createMock<ServiceAccountsRepository>(serviceAccounts),
      createMock<WorkSessionsRepository>(sessionRepo),
      createMock<WorkSessionSubjectsRepository>(subjectRepo),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('opens a session with the plan-runner service-account actor and verified on_behalf from the plan run', async () => {
    planRunsRepository.findByQueueNameAndBullmqJobId.mockResolvedValue(
      createMock<PlanRun>({ actorUserId: 'user-9', id: 'run-1' }),
    );

    const sessionId = await service.openPlanRunSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    expect(sessionId).toBe('session-1');
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorServiceAccountId: PLAN_RUNNER_SA_ID,
        actorUserId: null,
        externalRef: JOB_ID,
        onBehalfOfUserId: 'user-9',
        onBehalfOfVerified: true,
        planRunId: 'run-1',
        toolName: 'plan-runner',
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

  it('actors the session to the worker token principal so it matches the request principal', async () => {
    vi.stubEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', 'ot_sa_worker_token');
    planRunsRepository.findByQueueNameAndBullmqJobId.mockResolvedValue(
      createMock<PlanRun>({ actorUserId: 'user-9', id: 'run-1' }),
    );
    credentials.verifyBearerToken.mockResolvedValue({
      credentialId: 'cred-1',
      serviceAccountId: 'principal-sa',
    });

    await service.openPlanRunSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    // Actor is the token's principal, NOT the name-lookup SA.
    expect(credentials.verifyBearerToken).toHaveBeenCalledWith(
      'ot_sa_worker_token',
    );
    expect(serviceAccounts.findByName).not.toHaveBeenCalled();
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorServiceAccountId: 'principal-sa' }),
    );
  });

  it('falls back to the plan-runner SA by name when the worker token does not verify', async () => {
    vi.stubEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', 'ot_sa_bad_token');
    planRunsRepository.findByQueueNameAndBullmqJobId.mockResolvedValue(
      createMock<PlanRun>({ actorUserId: null, id: 'run-3' }),
    );
    credentials.verifyBearerToken.mockResolvedValue(null);

    await service.openPlanRunSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    expect(serviceAccounts.findByName).toHaveBeenCalledWith('plan-runner');
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorServiceAccountId: PLAN_RUNNER_SA_ID }),
    );
  });

  it('leaves on_behalf unverified when the plan run has no actor user', async () => {
    planRunsRepository.findByQueueNameAndBullmqJobId.mockResolvedValue(
      createMock<PlanRun>({ actorUserId: null, id: 'run-2' }),
    );

    await service.openPlanRunSession({
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

  it('returns null (best-effort) when the plan-runner service account is missing', async () => {
    serviceAccounts.findByName.mockResolvedValue(null);

    const sessionId = await service.openPlanRunSession({
      bullmqJobId: JOB_ID,
      planId: PLAN_ID,
      queueName: QUEUE,
    });

    expect(sessionId).toBeNull();
    expect(sessionRepo.create).not.toHaveBeenCalled();
  });

  it('never throws when the ledger write fails', async () => {
    planRunsRepository.findByQueueNameAndBullmqJobId.mockResolvedValue(
      createMock<PlanRun>({ actorUserId: 'user-9', id: 'run-1' }),
    );
    sessionRepo.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.openPlanRunSession({
        bullmqJobId: JOB_ID,
        planId: PLAN_ID,
        queueName: QUEUE,
      }),
    ).resolves.toBeNull();
  });

  it('closePlanRunSession is a no-op for a null id', async () => {
    await service.closePlanRunSession(null, 'summary');
    expect(sessionRepo.close).not.toHaveBeenCalled();
  });

  it('closePlanRunSession closes the session explicitly with its summary', async () => {
    await service.closePlanRunSession('session-1', 'done');

    expect(sessionRepo.close).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ closedBy: 'explicit', summary: 'done' }),
    );
  });
});
