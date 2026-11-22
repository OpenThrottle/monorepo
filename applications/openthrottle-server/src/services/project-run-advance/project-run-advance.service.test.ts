import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  PlanRun,
  PlanRunsRepository,
  PlansRepository,
  ProjectRun,
  ProjectRunsRepository,
  RepositoriesRepository,
  RepositoryCheckoutsRepository,
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSession,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlanRunsRepositoryMock,
  createPlansRepositoryMock,
  createProjectRunsRepositoryMock,
  createRepositoriesRepositoryMock,
  createRepositoryCheckoutsRepositoryMock,
  createWorkArtifactsRepositoryMock,
  createWorkSessionsRepositoryMock,
  planRunsFactory,
  plansFactory,
  projectRunsFactory,
  repositoriesFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { DataSource, QueryRunner } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanEnqueueService } from '../../graphql/plans/plan-enqueue/plan-enqueue.service.ts';
import type { PlanStatusService } from '../../graphql/plans/plan-status/plan-status.service.ts';
import { PROJECT_RUN_SETTLE_GRACE_MS } from './project-run-advance.constants.ts';
import { ProjectRunAdvanceService } from './project-run-advance.service.ts';

const RUN_ID = '01a20220-0000-7000-8000-000000000001';
const PROJECT_ID = '01a20220-0000-7000-8000-000000000002';
const PLAN_1 = '01a20220-0000-7000-8000-0000000000a1';
const PLAN_2 = '01a20220-0000-7000-8000-0000000000a2';
const USER_ID = '01a20220-0000-7000-8000-0000000000f1';

const FIXED_NOW = new Date('2026-11-22T12:00:00.000Z');
const JUST_NOW = new Date(FIXED_NOW.getTime() - 1_000);
const LONG_AGO = new Date(
  FIXED_NOW.getTime() - PROJECT_RUN_SETTLE_GRACE_MS - 60_000,
);

const plan = (
  id: string,
  status: string,
  overrides: Partial<Plan> = {},
): Plan => {
  return plansFactory.build({
    id,
    projectId: PROJECT_ID,
    status,
    ...overrides,
  });
};

const ourRun = (
  planId: string,
  status: string,
  overrides: Partial<PlanRun> = {},
): PlanRun => {
  return planRunsFactory.build({
    planId,
    projectRunId: RUN_ID,
    status,
    updatedAt: LONG_AGO,
    ...overrides,
  });
};

describe('ProjectRunAdvanceService', () => {
  const projectRuns = createProjectRunsRepositoryMock();
  const planRuns = createPlanRunsRepositoryMock();
  const plans = createPlansRepositoryMock();
  const repositories = createRepositoriesRepositoryMock();
  const checkouts = createRepositoryCheckoutsRepositoryMock();
  const workArtifacts = createWorkArtifactsRepositoryMock();
  const workSessions = createWorkSessionsRepositoryMock();
  const enqueueOrchestrator = vi.fn();
  const cancelRun = vi.fn();
  const warn = vi.fn();
  const query = vi.fn();
  const release = vi.fn();

  let projectRun: ProjectRun;
  let service: ProjectRunAdvanceService;

  /** Records a PR artifact for the given plan run, over the work-ledger session bridge. */
  const givePullRequest = (planRunId: string): void => {
    workSessions.findBy.mockResolvedValue([
      asMock<WorkSession>({ id: 'session-1', planRunId }),
    ]);
    workArtifacts.findBy.mockResolvedValue([
      asMock<WorkArtifact>({ payload: { number: 7 }, sessionId: 'session-1' }),
    ]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
    projectRun = projectRunsFactory.build({
      actorUserId: USER_ID,
      id: RUN_ID,
      projectId: PROJECT_ID,
      status: 'IN_PROGRESS',
    });
    projectRuns.findRunById.mockImplementation(async () => {
      return projectRun;
    });
    projectRuns.setCurrentPlan.mockResolvedValue(true);
    projectRuns.settleCancelled.mockResolvedValue(true);
    projectRuns.settleCompleted.mockResolvedValue(true);
    projectRuns.settleStopped.mockResolvedValue(true);
    planRuns.findBy.mockResolvedValue([]);
    planRuns.findOne.mockResolvedValue(null);
    planRuns.hasActiveRun.mockResolvedValue(false);
    plans.listInProject.mockResolvedValue([]);
    repositories.findOne.mockResolvedValue(null);
    checkouts.findOne.mockResolvedValue(null);
    workSessions.findBy.mockResolvedValue([]);
    workArtifacts.findBy.mockResolvedValue([]);
    enqueueOrchestrator.mockResolvedValue({ jobId: 'job-1' });
    query.mockImplementation(async (sql: string) => {
      return sql.includes('pg_try_advisory_lock') ? [{ locked: true }] : [];
    });

    const dataSource = createMock<DataSource>({
      createQueryRunner: () => {
        return createMock<QueryRunner>({ connect: vi.fn(), query, release });
      },
    });

    service = new ProjectRunAdvanceService(
      dataSource,
      createMock<LoggerService>({ warn }),
      createMock<PlanEnqueueService>({ enqueueOrchestrator }),
      asMock<PlanRunsRepository>(planRuns),
      asMock<PlansRepository>(plans),
      createMock<PlanStatusService>({ cancelRun }),
      asMock<ProjectRunsRepository>(projectRuns),
      asMock<RepositoriesRepository>(repositories),
      asMock<RepositoryCheckoutsRepository>(checkouts),
      asMock<WorkArtifactsRepository>(workArtifacts),
      asMock<WorkSessionsRepository>(workSessions),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when another advancer holds the lock', () => {
    it('returns busy and makes no move', async () => {
      query.mockResolvedValue([{ locked: false }]);

      await expect(service.advance(RUN_ID)).resolves.toEqual({ kind: 'busy' });
      expect(projectRuns.findRunById).not.toHaveBeenCalled();
      expect(release).toHaveBeenCalled();
    });
  });

  describe('when two advancers race the same transition', () => {
    it('the loser of a guarded settle reports lost_race', async () => {
      projectRuns.settleCompleted.mockResolvedValue(false);

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'lost_race',
      });
    });

    it('the loser of the plan claim enqueues nothing', async () => {
      plans.listInProject.mockResolvedValue([plan(PLAN_1, 'PENDING')]);
      projectRuns.setCurrentPlan.mockResolvedValue(false);

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'lost_race',
      });
      expect(enqueueOrchestrator).not.toHaveBeenCalled();
    });
  });

  describe('when the run does not exist or is settled', () => {
    it('returns not_found for an unknown id', async () => {
      projectRuns.findRunById.mockResolvedValue(null);

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'not_found',
      });
    });

    it('returns already_settled and unlocks', async () => {
      projectRun = { ...projectRun, status: 'STOPPED' };

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'already_settled',
        status: 'STOPPED',
      });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_unlock'),
        [`project_run:${RUN_ID}`],
      );
    });
  });

  describe('when a cancel was requested', () => {
    it('cancels the current plan run and settles CANCELLED', async () => {
      projectRun = {
        ...projectRun,
        cancelRequestedAt: FIXED_NOW,
        cancelRequestedBy: USER_ID,
        currentPlanId: PLAN_1,
      };
      planRuns.findBy.mockResolvedValue([ourRun(PLAN_1, 'IN_PROGRESS')]);

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'cancelled',
      });
      expect(cancelRun).toHaveBeenCalledWith(PLAN_1, USER_ID, {
        actorKind: 'user',
        actorSub: USER_ID,
      });
      expect(projectRuns.settleCancelled).toHaveBeenCalledWith(RUN_ID);
    });

    it('still settles CANCELLED when the plan-level cancel fails', async () => {
      projectRun = {
        ...projectRun,
        cancelRequestedAt: FIXED_NOW,
        currentPlanId: PLAN_1,
      };
      planRuns.findBy.mockResolvedValue([ourRun(PLAN_1, 'QUEUED')]);
      cancelRun.mockRejectedValue(new Error('boom'));

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'cancelled',
      });
      expect(warn).toHaveBeenCalled();
    });

    it('cancels nothing when the current plan run already settled', async () => {
      projectRun = {
        ...projectRun,
        cancelRequestedAt: FIXED_NOW,
        currentPlanId: PLAN_1,
      };
      planRuns.findBy.mockResolvedValue([ourRun(PLAN_1, 'COMPLETED')]);

      await service.advance(RUN_ID);

      expect(cancelRun).not.toHaveBeenCalled();
    });
  });

  describe('walking the plans', () => {
    it('passes over COMPLETED, SKIPPED and CANCELED plans', async () => {
      plans.listInProject.mockResolvedValue([
        plan('p-done', 'COMPLETED'),
        plan('p-skip', 'SKIPPED'),
        plan('p-cancel', 'CANCELED'),
        plan(PLAN_2, 'PENDING'),
      ]);

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        jobId: 'job-1',
        kind: 'enqueued',
        planId: PLAN_2,
      });
    });

    it('stops on a plan that is already BLOCKED', async () => {
      plans.listInProject.mockResolvedValue([plan(PLAN_1, 'BLOCKED')]);

      await expect(service.advance(RUN_ID)).resolves.toMatchObject({
        kind: 'stopped',
        planId: PLAN_1,
      });
      expect(projectRuns.settleStopped).toHaveBeenCalledWith(
        RUN_ID,
        PLAN_1,
        expect.stringContaining('BLOCKED'),
      );
    });

    it('settles COMPLETED when no plan is left', async () => {
      plans.listInProject.mockResolvedValue([plan(PLAN_1, 'COMPLETED')]);

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'completed',
      });
    });
  });

  describe('when the current plan has a run tagged with this project run', () => {
    beforeEach(() => {
      plans.listInProject.mockResolvedValue([
        plan(PLAN_1, 'IN_PROGRESS'),
        plan(PLAN_2, 'PENDING'),
      ]);
    });

    it('waits while it is QUEUED, IN_PROGRESS or SCHEDULED', async () => {
      const run = ourRun(PLAN_1, 'IN_PROGRESS');
      planRuns.findBy.mockResolvedValue([run]);

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'waiting',
        planId: PLAN_1,
        planRunId: run.id,
      });
      expect(enqueueOrchestrator).not.toHaveBeenCalled();
    });

    it('moves to the next plan once it settled COMPLETED with a PR', async () => {
      const run = ourRun(PLAN_1, 'COMPLETED');
      planRuns.findBy.mockResolvedValue([run]);
      givePullRequest(run.id);

      await expect(service.advance(RUN_ID)).resolves.toMatchObject({
        kind: 'enqueued',
        planId: PLAN_2,
      });
    });

    it('waits within the grace window for a COMPLETED run’s PR', async () => {
      const run = ourRun(PLAN_1, 'COMPLETED', { updatedAt: JUST_NOW });
      planRuns.findBy.mockResolvedValue([run]);

      await expect(service.advance(RUN_ID)).resolves.toMatchObject({
        kind: 'waiting',
      });
    });

    it('stops when it settled COMPLETED without a PR', async () => {
      const run = ourRun(PLAN_1, 'COMPLETED');
      planRuns.findBy.mockResolvedValue([run]);

      await expect(service.advance(RUN_ID)).resolves.toMatchObject({
        kind: 'stopped',
        planId: PLAN_1,
        reason: expect.stringContaining('without a pull request'),
      });
      expect(enqueueOrchestrator).not.toHaveBeenCalled();
    });

    it.each([
      'FAILED',
      'CANCELLED',
      'STALE',
      'SKIPPED',
      'MISSED',
      'SUPERSEDED',
    ])('stops when it settled %s, naming the status', async (status) => {
      const run = ourRun(PLAN_1, status, { settledReason: 'it broke' });
      planRuns.findBy.mockResolvedValue([run]);

      await expect(service.advance(RUN_ID)).resolves.toMatchObject({
        kind: 'stopped',
        planId: PLAN_1,
        reason: `Plan run ${run.id} settled ${status}: it broke`,
      });
    });

    describe('when it hit a usage limit', () => {
      it('waits on the continuation run', async () => {
        const limited = ourRun(PLAN_1, 'USAGE_LIMITED');
        const continuation = ourRun(PLAN_1, 'QUEUED', {
          projectRunId: null,
          resumeOfRunId: limited.id,
        });
        // The continuation is untagged here, so only the resume_of_run_id lookup finds it.
        planRuns.findBy.mockImplementation(async (options) => {
          const where = options?.where;
          const isContinuationLookup =
            where !== undefined &&
            !Array.isArray(where) &&
            'resumeOfRunId' in where;

          return isContinuationLookup ? [continuation] : [limited];
        });

        await expect(service.advance(RUN_ID)).resolves.toEqual({
          kind: 'waiting',
          planId: PLAN_1,
          planRunId: continuation.id,
        });
      });

      it('stops when the chain ends without a continuation', async () => {
        planRuns.findBy.mockResolvedValue([ourRun(PLAN_1, 'USAGE_LIMITED')]);

        await expect(service.advance(RUN_ID)).resolves.toMatchObject({
          kind: 'stopped',
          reason: expect.stringContaining('no continuation'),
        });
      });

      it('waits within the grace window for the continuation to appear', async () => {
        planRuns.findBy.mockResolvedValue([
          ourRun(PLAN_1, 'USAGE_LIMITED', { updatedAt: JUST_NOW }),
        ]);

        await expect(service.advance(RUN_ID)).resolves.toMatchObject({
          kind: 'waiting',
        });
      });
    });
  });

  describe('when the current plan has no run yet', () => {
    it('enqueues it through the shared pipeline, tagged with the project run', async () => {
      const repository = repositoriesFactory.build({
        defaultBranch: 'develop',
      });
      const target = plan(PLAN_1, 'PENDING', {
        runConfig: {
          ...plansFactory.build().runConfig,
          workspace: {
            checkoutId: '',
            repositoryId: repository.id,
            workingDirectory: '',
          },
        },
      });
      plans.listInProject.mockResolvedValue([target]);
      repositories.findOne.mockResolvedValue(repository);

      await service.advance(RUN_ID);

      expect(projectRuns.setCurrentPlan).toHaveBeenCalledWith(RUN_ID, PLAN_1);
      expect(enqueueOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: USER_ID,
          branch: 'develop',
          checkoutId: null,
          idempotencyKey: `project-run-${RUN_ID}-${PLAN_1}`,
          mode: 'plan',
          planId: PLAN_1,
          projectRunId: RUN_ID,
          repositoryId: repository.id,
          runner: null,
        }),
      );
    });

    it('falls back to main when no repository records a default branch', async () => {
      plans.listInProject.mockResolvedValue([plan(PLAN_1, 'PENDING')]);

      await service.advance(RUN_ID);

      expect(enqueueOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({ branch: 'main' }),
      );
    });

    it('stops rather than double-run a plan with an unrelated active run', async () => {
      plans.listInProject.mockResolvedValue([plan(PLAN_1, 'IN_PROGRESS')]);
      planRuns.hasActiveRun.mockResolvedValue(true);

      await expect(service.advance(RUN_ID)).resolves.toMatchObject({
        kind: 'stopped',
        reason: expect.stringContaining('did not start'),
      });
      expect(enqueueOrchestrator).not.toHaveBeenCalled();
    });

    it('stops with the refusal when the enqueue is refused', async () => {
      plans.listInProject.mockResolvedValue([plan(PLAN_1, 'PENDING')]);
      enqueueOrchestrator.mockRejectedValue(
        new BadRequestException('Plan has no runnable tasks'),
      );

      await expect(service.advance(RUN_ID)).resolves.toEqual({
        kind: 'stopped',
        planId: PLAN_1,
        reason: 'Enqueue refused: Plan has no runnable tasks',
      });
    });
  });
});
