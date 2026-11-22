/**
 * @description The project-run lifecycle end to end against a real, migrated openthrottle database:
 * the real ProjectRunAdvanceService, repositories, advisory lock and guarded transitions, with only
 * the two edges that would start or stop an agent faked — the plan-run enqueue (which records the
 * plan_runs row exactly as the real pipeline does, tagged with project_run_id) and the plan-run
 * cancel. Plan-run settles are written the way the plans worker writes them, and a PR is recorded
 * the way the work ledger records it (a session bridged to the run, a pull_request artifact).
 *
 * Opt-in, because it needs a live Postgres (a worktree's own database works):
 *
 *   POSTGRES_HOST=localhost OT_OPENTHROTTLE_DB_INTEGRATION=true \
 *     pnpm nx run openthrottle-server:test --skip-nx-cache \
 *     -- src/services/project-run-advance/project-run-advance.integration.test.ts
 *
 * Which runner a plan runs on is the enqueue pipeline's decision (PlanEnqueueService reads the
 * plan's stored runner; its own tests cover that). Here the project mixes a Ralph and an OT Loop
 * plan to show the advance step hands every plan to the same pipeline without choosing a runner.
 */

import { randomUUID } from 'node:crypto';

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getOpenThrottleTypeOrmOptions,
  Plan,
  PLAN_RUN_STATUS,
  PlanRun,
  PlanRunsRepository,
  PlansRepository,
  Project,
  ProjectRepositoriesRepository,
  ProjectRepository,
  ProjectRun,
  ProjectRunsRepository,
  RepositoriesRepository,
  Repository,
  RepositoryCheckout,
  RepositoryCheckoutsRepository,
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSession,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { DataSource } from 'typeorm';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { PlanEnqueueService } from '../../graphql/plans/plan-enqueue/plan-enqueue.service.ts';
import type { PlanStatusService } from '../../graphql/plans/plan-status/plan-status.service.ts';
import { PROJECT_RUN_SETTLE_GRACE_MS } from './project-run-advance.constants.ts';
import { ProjectRunAdvanceService } from './project-run-advance.service.ts';

const ENABLED = process.env.OT_OPENTHROTTLE_DB_INTEGRATION === 'true';

describe.runIf(ENABLED)('project run lifecycle (live database)', () => {
  let dataSource: DataSource;
  let service: ProjectRunAdvanceService;
  let planRuns: PlanRunsRepository;
  let projectRuns: ProjectRunsRepository;
  let plansRepository: PlansRepository;
  let actorUserId: string;
  /** The database's clock: settles stamp updated_at with NOW(), so the fake clock starts there. */
  let dbNow: Date;
  let projectId: string;
  /** In project order: done (already COMPLETED), ralph, otLoop, last (ralph). */
  let plans: { done: Plan; last: Plan; otLoop: Plan; ralph: Plan };
  const enqueued: { planId: string; runner: string }[] = [];
  const cancelled: string[] = [];

  const createPlan = async (
    title: string,
    sortOrder: number,
    status: string,
    runner: 'ot-loop' | 'ralph',
  ): Promise<Plan> => {
    const runConfig = { ...getDefaultPlanRunConfigStorage(), runner };
    const repo = dataSource.getRepository(Plan);

    return repo.save(
      repo.create({
        author: 'project-run-integration',
        category: 'test',
        projectId,
        projectSortOrder: sortOrder,
        runConfig,
        status,
        title,
      }),
    );
  };

  /** The fake enqueue: what the real pipeline writes, minus the BullMQ job and the agent. */
  const enqueueOrchestrator = vi.fn(
    async (
      params: Parameters<PlanEnqueueService['enqueueOrchestrator']>[0],
    ) => {
      const plan = await plansRepository.findOne({
        where: { id: params.planId },
      });
      enqueued.push({
        planId: params.planId,
        runner: plan?.runConfig.runner ?? 'ralph',
      });
      const run = await planRuns.recordQueuedRun({
        actorUserId: params.actorUserId ?? null,
        branch: params.branch,
        bullmqJobId: params.idempotencyKey ?? randomUUID(),
        executionBackend: 'claude',
        planId: params.planId,
        projectRunId: params.projectRunId ?? null,
        queueName: 'plans',
        runKind: 'orchestrator',
      });

      return {
        executionBackend: 'claude' as const,
        jobId: run.bullmqJobId ?? '',
        planId: params.planId,
        queuePosition: 1,
        queueTotal: 1,
      };
    },
  );

  /** The fake plan-run cancel: settles the plan's unsettled runs CANCELLED, as the real path does. */
  const cancelRun = vi.fn();
  const cancelPlanRuns = async (planId: string): Promise<void> => {
    cancelled.push(planId);
    await dataSource.query(
      `UPDATE plan_runs SET status = 'CANCELLED' WHERE plan_id = $1 AND status IN ('QUEUED', 'IN_PROGRESS')`,
      [planId],
    );
  };

  /** The run this project run started for a plan. */
  const runFor = async (
    projectRunId: string,
    planId: string,
  ): Promise<PlanRun> => {
    const run = await planRuns.findOne({
      order: { createdAt: 'DESC' },
      where: { planId, projectRunId },
    });
    if (run === null) {
      throw new Error(`no run for plan ${planId}`);
    }

    return run;
  };

  /** Settles a plan run, and with `pr` records its draft PR on the work ledger. */
  const settle = async (
    run: PlanRun,
    status: string,
    pr: number | null,
  ): Promise<void> => {
    await dataSource.query(`UPDATE plan_runs SET status = $1 WHERE id = $2`, [
      status,
      run.id,
    ]);

    if (pr === null) return;

    const [session] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO work_sessions (tool_name, actor_user_id, plan_run_id) VALUES ('project-run-integration', $1, $2) RETURNING id`,
      [actorUserId, run.id],
    );
    await dataSource.query(
      `INSERT INTO work_artifacts (session_id, type, source, external_key, payload) VALUES ($1, 'pull_request', 'agent', $2, $3)`,
      [
        session?.id,
        `integration/${run.id}#${pr}`,
        JSON.stringify({ number: pr, repo: 'integration/project-runs' }),
      ],
    );
  };

  const startRun = async (): Promise<ProjectRun> => {
    return projectRuns.create({ actorUserId, projectId });
  };

  beforeAll(async () => {
    cancelRun.mockImplementation(cancelPlanRuns);
    dataSource = new DataSource(getOpenThrottleTypeOrmOptions());
    await dataSource.initialize();

    planRuns = new PlanRunsRepository(dataSource.getRepository(PlanRun));
    projectRuns = new ProjectRunsRepository(
      dataSource.getRepository(ProjectRun),
    );
    plansRepository = new PlansRepository(dataSource.getRepository(Plan));

    const [user] = await dataSource.query<{ id: string }[]>(
      `SELECT id FROM users ORDER BY created_at LIMIT 1`,
    );
    if (user === undefined) {
      throw new Error('the integration database has no user to act as');
    }
    actorUserId = user.id;

    service = new ProjectRunAdvanceService(
      dataSource,
      createMock<LoggerService>(),
      createMock<PlanEnqueueService>({ enqueueOrchestrator }),
      planRuns,
      plansRepository,
      createMock<PlanStatusService>({ cancelRun }),
      projectRuns,
      new RepositoriesRepository(
        dataSource.getRepository(Repository),
        new ProjectRepositoriesRepository(
          dataSource.getRepository(ProjectRepository),
        ),
      ),
      new RepositoryCheckoutsRepository(
        dataSource.getRepository(RepositoryCheckout),
      ),
      new WorkArtifactsRepository(dataSource.getRepository(WorkArtifact)),
      new WorkSessionsRepository(dataSource.getRepository(WorkSession)),
    );
  });

  beforeEach(async () => {
    const [clock] =
      await dataSource.query<{ now: Date }[]>(`SELECT NOW() AS now`);
    dbNow = new Date(clock?.now ?? 0);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(dbNow);
    enqueued.length = 0;
    cancelled.length = 0;

    const projectRepo = dataSource.getRepository(Project);
    const project = await projectRepo.save(
      projectRepo.create({ name: `project-run-integration ${randomUUID()}` }),
    );
    projectId = project.id;
    plans = {
      done: await createPlan('Done already', 1000, 'COMPLETED', 'ralph'),
      last: await createPlan('Last (Ralph)', 4000, 'PENDING', 'ralph'),
      otLoop: await createPlan('Second (OT Loop)', 3000, 'PENDING', 'ot-loop'),
      ralph: await createPlan('First (Ralph)', 2000, 'PENDING', 'ralph'),
    };
  });

  afterEach(async () => {
    vi.useRealTimers();
    // Plans cascade their plan_runs (and the ledger rows bridge-delete); the project cascades its runs.
    await dataSource.query(`DELETE FROM plans WHERE project_id = $1`, [
      projectId,
    ]);
    await dataSource.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    await dataSource.query(
      `DELETE FROM work_sessions WHERE tool_name = 'project-run-integration'`,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('runs plans strictly in order, passing over a finished one, each on its own runner', async () => {
    const run = await startRun();

    await expect(service.advance(run.id)).resolves.toMatchObject({
      kind: 'enqueued',
      planId: plans.ralph.id,
    });
    // Its run is unsettled, so another advance waits rather than starting plan two.
    await expect(service.advance(run.id)).resolves.toMatchObject({
      kind: 'waiting',
      planId: plans.ralph.id,
    });

    await settle(await runFor(run.id, plans.ralph.id), 'COMPLETED', 101);
    await expect(service.advance(run.id)).resolves.toMatchObject({
      kind: 'enqueued',
      planId: plans.otLoop.id,
    });

    await settle(await runFor(run.id, plans.otLoop.id), 'COMPLETED', 102);
    await expect(service.advance(run.id)).resolves.toMatchObject({
      kind: 'enqueued',
      planId: plans.last.id,
    });

    await settle(await runFor(run.id, plans.last.id), 'COMPLETED', 103);
    await expect(service.advance(run.id)).resolves.toEqual({
      kind: 'completed',
    });

    expect(enqueued).toEqual([
      { planId: plans.ralph.id, runner: 'ralph' },
      { planId: plans.otLoop.id, runner: 'ot-loop' },
      { planId: plans.last.id, runner: 'ralph' },
    ]);
    // Every enqueue left the runner to the pipeline, tagged with the project run.
    for (const call of enqueueOrchestrator.mock.calls) {
      expect(call[0]).toMatchObject({ projectRunId: run.id, runner: null });
    }
  });

  it('stops on a failed plan, never enqueues the next, and resumes there on a fresh run', async () => {
    const first = await startRun();

    await service.advance(first.id);
    await settle(await runFor(first.id, plans.ralph.id), 'COMPLETED', 201);
    await dataSource.query(
      `UPDATE plans SET status = 'COMPLETED' WHERE id = $1`,
      [plans.ralph.id],
    );
    await service.advance(first.id);
    await settle(await runFor(first.id, plans.otLoop.id), 'FAILED', null);

    await expect(service.advance(first.id)).resolves.toMatchObject({
      kind: 'stopped',
      planId: plans.otLoop.id,
    });
    const stopped = await projectRuns.findRunById(first.id);
    expect(stopped).toMatchObject({
      status: 'STOPPED',
      stoppedByPlanId: plans.otLoop.id,
    });
    expect(stopped?.stoppedReason).toContain('FAILED');
    expect(enqueued.map((entry) => entry.planId)).not.toContain(plans.last.id);

    // Resume = a fresh run: the finished plans are passed over and it starts at the stopper.
    const resumed = await startRun();
    await expect(service.advance(resumed.id)).resolves.toMatchObject({
      kind: 'enqueued',
      planId: plans.otLoop.id,
    });
  });

  it('cancels mid-run: the plan run is cancelled and the project run settles CANCELLED', async () => {
    const run = await startRun();
    await service.advance(run.id);

    await expect(
      projectRuns.stampCancelRequested(run.id, actorUserId),
    ).resolves.toBe(true);
    await expect(service.advance(run.id)).resolves.toEqual({
      kind: 'cancelled',
    });

    expect(cancelled).toEqual([plans.ralph.id]);
    await expect(runFor(run.id, plans.ralph.id)).resolves.toMatchObject({
      status: PLAN_RUN_STATUS.CANCELLED,
    });
    await expect(projectRuns.findRunById(run.id)).resolves.toMatchObject({
      status: 'CANCELLED',
    });
  });

  it('stops on a run that settled COMPLETED without a PR, once the grace has passed', async () => {
    const run = await startRun();
    await service.advance(run.id);
    await settle(await runFor(run.id, plans.ralph.id), 'COMPLETED', null);

    // Inside the grace the PR may still be on its way.
    await expect(service.advance(run.id)).resolves.toMatchObject({
      kind: 'waiting',
    });

    vi.setSystemTime(
      new Date(dbNow.getTime() + PROJECT_RUN_SETTLE_GRACE_MS + 60_000),
    );
    await expect(service.advance(run.id)).resolves.toMatchObject({
      kind: 'stopped',
      planId: plans.ralph.id,
      reason: expect.stringContaining('without a pull request'),
    });
  });

  it('never double-runs a plan when two advancers race', async () => {
    const run = await startRun();

    const outcomes = await Promise.all([
      service.advance(run.id),
      service.advance(run.id),
      service.advance(run.id),
    ]);

    const runsForPlan = await planRuns.findBy({
      where: { planId: plans.ralph.id },
    });
    expect(runsForPlan).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.kind === 'enqueued'),
    ).toHaveLength(1);
  });

  it('refuses to double-run a plan that already has an unrelated active run', async () => {
    await planRuns.recordQueuedRun({
      bullmqJobId: `unrelated-${randomUUID()}`,
      executionBackend: 'claude',
      planId: plans.ralph.id,
      queueName: 'plans',
      runKind: 'orchestrator',
    });
    const run = await startRun();

    await expect(service.advance(run.id)).resolves.toMatchObject({
      kind: 'stopped',
      planId: plans.ralph.id,
      reason: expect.stringContaining('did not start'),
    });
    expect(enqueued).toEqual([]);
  });
});
