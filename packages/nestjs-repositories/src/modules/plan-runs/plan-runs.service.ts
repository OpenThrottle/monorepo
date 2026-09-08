import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import { IsNull, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import type { PlanRunConfigSnapshot } from '@openthrottle/openthrottle-plan-config';
import { PLAN_RUN_STATUS } from './plan-runs.constants';
import type { PlanRunExecutionBackend, PlanRunKind } from './plan-run.entity';
import { PlanRun } from './plan-run.entity';

interface RecordQueuedPlanRunInput {
  /** User who enqueued the run (auth sub for a user principal); null for service-account/system. */
  readonly actorUserId?: string | null;
  /** Git branch the run operates on, captured at kickoff. Null until the required-input path supplies it. */
  readonly branch?: string | null;
  readonly bullmqJobId: string;
  /** Worktree/checkout the run runs in (repository_checkouts.id); the durable on-disk home for deep-links. */
  readonly checkoutId?: string | null;
  readonly executionBackend: WorkflowConfigRunner;
  /** Resolved agent model id (queryable projection of run_config_snapshot.ralph.model). */
  readonly model?: string | null;
  readonly planId: string;
  readonly queueName: string;
  readonly runConfigSnapshot?: PlanRunConfigSnapshot | null;
  readonly runKind: PlanRunKind;
}

/**
 * Input for a detached workflow-ralph CLI run row. The CLI carries no BullMQ job
 * and drives its own iteration loop, so the row is inserted with a null
 * bullmqJobId and runKind 'orchestrator'.
 */
interface RegisterCliPlanRunInput {
  /** User who started the CLI run (auth sub for a user principal); null for service-account/system. */
  readonly actorUserId?: string | null;
  /**
   * OPTIONAL git branch the CLI run operates on. Omit/null → store null; non-empty
   * strings are stored verbatim (no trim/reject — enqueue remains the REQUIRED boundary).
   */
  readonly branch?: string | null;
  readonly executionBackend: PlanRunExecutionBackend;
  /**
   * Whether this run's owner bumps its heartbeat on a timer. Defaults to true so
   * the detached workflow-ralph CLI (which does, on a ~15s timer) is untouched;
   * an owner with no timer — an interactive /ot-loop agent turn — passes false to
   * opt out of every heartbeat-based liveness judgement (migration 110).
   */
  readonly heartbeatExpected?: boolean;
  readonly hostname: string | null;
  /** Resolved agent model id for this run; null when the caller cannot determine one. */
  readonly model?: string | null;
  readonly pid: number | null;
  readonly planId: string;
  readonly workerId: string | null;
}

/** Where a run is executing; stamped at job start, cleared at finish. */
interface RunLocation {
  readonly bullmqJobId: string;
  readonly hostname: string | null;
  readonly pid: number | null;
  readonly queueName: string;
  readonly workerId: string | null;
}

/** The durable cancel-request marker for a plan's live run. */
interface CancelMarker {
  readonly cancelRequestedAt: Date;
  readonly cancelRequestedBy: string | null;
}

@Injectable()
export class PlanRunsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(PlanRun)
    private readonly planRunRepository: Repository<PlanRun>,
  ) {
    this.logger.debug('🧩 plan-runs 🧩');
  }

  /**
   * @description Returns the TypeORM repository for plan_runs. Use for run audit queries.
   */
  getRepository(): Repository<PlanRun> {
    return this.planRunRepository;
  }

  /**
   * @description Records a queued Ralph run, idempotent per (queueName, bullmqJobId) so repeated
   * enqueue calls round-trip the same audit row (refreshing the mutable enqueue fields).
   *
   * Uses find-then-save rather than `repo.upsert()`: the (queueName, bullmqJobId) uniqueness is a
   * PARTIAL unique index (`... WHERE bullmq_job_id IS NOT NULL`, migration 076) which TypeORM's
   * `ON CONFLICT (queue_name, bullmq_job_id)` cannot target. The partial index still guards against
   * concurrent duplicate inserts at the DB level. Pass `manager` to enlist in a caller-owned tx.
   */
  async recordQueuedRun(
    input: RecordQueuedPlanRunInput,
    manager?: EntityManager,
  ): Promise<PlanRun> {
    const repo = manager
      ? manager.getRepository(PlanRun)
      : this.getRepository();
    // The snapshot is written to an opaque jsonb column; type it as `object | null`
    // so TypeORM's QueryDeepPartialEntity does not deep-recurse into the snapshot's
    // `readonly unknown[]` members (which it cannot express), keeping the write cast-free.
    const runConfigSnapshot: object | null = input.runConfigSnapshot ?? null;
    const rowInput = {
      actorUserId: input.actorUserId ?? null,
      branch: input.branch ?? null,
      bullmqJobId: input.bullmqJobId,
      checkoutId: input.checkoutId ?? null,
      executionBackend: input.executionBackend,
      model: input.model ?? null,
      planId: input.planId,
      queueName: input.queueName,
      runConfigSnapshot,
      runKind: input.runKind,
      status: 'QUEUED',
    };

    const existing = await repo.findOne({
      where: {
        bullmqJobId: input.bullmqJobId,
        queueName: input.queueName,
      },
    });

    if (existing) {
      await repo.update({ id: existing.id }, rowInput);

      return (await repo.findOne({ where: { id: existing.id } })) ?? existing;
    }

    return repo.save(repo.create(rowInput));
  }

  /**
   * @description Registers a detached workflow-ralph CLI run as a first-class plan_runs row so
   * {@link PlanRunsService.stampCancelRequested} (via PlanStatusService.cancelRun) has a row to
   * stamp the durable cancel marker on. Inserts with bullmqJobId NULL (permitted by the partial
   * unique index from migration 076 — see the entity note), runKind 'orchestrator' (the CLI drives
   * its own iteration loop, NOT the dead spawn worker), status 'IN_PROGRESS', and the run-location
   * columns (hostname/pid/workerId) stamped at creation. Creates NO BullMQ job — this is an
   * in-process laptop run, not a queued job. Returns the created run.
   */
  async registerCliRun(input: RegisterCliPlanRunInput): Promise<PlanRun> {
    const repo = this.getRepository();

    // Settle-on-next-register: an unsupervised run has no timer, so nothing settles it
    // promptly when its agent simply goes away. Registering a NEW unsupervised run for the
    // same plan is direct evidence the previous one is over — you do not start a second
    // interactive loop on a plan you are still driving. Settling here (before the insert, so
    // the new row is never a candidate) makes the common case — abandon a loop, re-run it —
    // clean up instantly, leaving the age sweep as the floor rather than the only path.
    if (input.heartbeatExpected === false) {
      await this.settleSupersededUnsupervisedRuns(input.planId);
    }

    return repo.save(
      repo.create({
        actorUserId: input.actorUserId ?? null,
        branch: input.branch ?? null,
        bullmqJobId: null,
        executionBackend: input.executionBackend,
        heartbeatExpected: input.heartbeatExpected ?? true,
        hostname: input.hostname,
        // Stamp the initial heartbeat at creation so the run is immediately alive
        // (avoids a false-stale window before the CLI's first heartbeat tick).
        lastHeartbeatAt: new Date(),
        model: input.model ?? null,
        pid: input.pid,
        planId: input.planId,
        queueName: 'plans',
        runKind: 'orchestrator',
        status: 'IN_PROGRESS',
        workerId: input.workerId,
      }),
    );
  }

  /**
   * @description Settles a detached-CLI run on exit, keyed on the RUN ID (not the
   * (queueName, bullmqJobId) pair, which {@link clearRunLocation} uses and which cannot address a
   * null-job-id CLI row). Sets the terminal status (COMPLETED / CANCELLED / FAILED) and nulls the
   * run-location columns; leaves the cancel marker intact (audit record). Returns the updated run,
   * or null when no row matched the id.
   */
  async settleCliRun(
    planRunId: string,
    status: string,
  ): Promise<PlanRun | null> {
    const repo = this.getRepository();

    await repo.update(
      { id: planRunId },
      { hostname: null, pid: null, status, workerId: null },
    );

    return repo.findOne({ where: { id: planRunId } });
  }

  /**
   * @description Finds the plan run for a (queueName, bullmqJobId) pair — the unique key a worker
   * knows at run time — so it can resolve plan_run_id + actor_user_id (for the work-ledger session).
   */
  async findByQueueNameAndBullmqJobId(
    queueName: string,
    bullmqJobId: string,
  ): Promise<PlanRun | null> {
    return this.getRepository().findOne({
      where: { bullmqJobId, queueName },
    });
  }

  /**
   * @description Returns a single run by its id, or null when none matches.
   */
  async findById(planRunId: string): Promise<PlanRun | null> {
    return this.getRepository().findOne({ where: { id: planRunId } });
  }

  /**
   * @description Back-fills `checkout_id` only when still NULL (never overwrites
   * an existing id). Race-safe via the WHERE clause. Returns the updated run,
   * or null when the row no longer exists.
   */
  async setCheckoutIdIfNull(
    planRunId: string,
    checkoutId: string,
  ): Promise<PlanRun | null> {
    await this.getRepository().update(
      { checkoutId: IsNull(), id: planRunId },
      { checkoutId },
    );

    return this.findById(planRunId);
  }

  /**
   * @description Rewrites `run_config_snapshot.workspace` for a run whose working directory was
   * resolved after enqueue — a plan run whose worktree OpenThrottle creates at job start only learns
   * the path then, and the snapshot has to show the directory the agent actually used. Leaves the
   * rest of the snapshot untouched; no-ops when the run or its snapshot is missing.
   */
  async setRunConfigSnapshotWorkspace(
    planRunId: string,
    workspace: {
      readonly checkoutId?: string | null;
      readonly workingDirectory: string;
    },
  ): Promise<PlanRun | null> {
    const run = await this.findById(planRunId);
    if (run === null || run.runConfigSnapshot == null) {
      return run;
    }

    const current = run.runConfigSnapshot;
    const checkoutId = workspace.checkoutId ?? current.workspace.checkoutId;

    const next: PlanRunConfigSnapshot = {
      ...current,
      workspace: {
        ...current.workspace,
        ...(checkoutId != null && checkoutId !== '' ? { checkoutId } : {}),
        workingDirectory: workspace.workingDirectory,
      },
    };

    // Same reason as `recordQueuedRun`: type the jsonb payload as `object` so TypeORM's
    // QueryDeepPartialEntity does not deep-recurse into the snapshot's readonly members.
    const runConfigSnapshot: object = next;

    await this.getRepository().update({ id: planRunId }, { runConfigSnapshot });

    return this.findById(planRunId);
  }

  /**
   * @description Returns recent plan runs newest first for GraphQL/UI audit views.
   */
  async findRecentByPlanId(planId: string, limit: number): Promise<PlanRun[]> {
    return this.getRepository().find({
      order: { createdAt: 'DESC' },
      take: limit,
      where: { planId },
    });
  }

  /**
   * @description Stamps run-location columns when a worker picks up the job (alongside
   * PlanRunCancellationService.attach). Best-effort by key; matches 0 rows for a run that was never
   * recorded (e.g. legacy). Returns the number of rows updated.
   */
  async markRunStarted(location: RunLocation): Promise<number> {
    const result = await this.getRepository().update(
      { bullmqJobId: location.bullmqJobId, queueName: location.queueName },
      {
        hostname: location.hostname,
        // Stamp the initial heartbeat when the worker picks up the job, so the run
        // is immediately alive before the processor's first heartbeat tick.
        lastHeartbeatAt: new Date(),
        pid: location.pid,
        workerId: location.workerId,
      },
    );

    return result.affected ?? 0;
  }

  /**
   * @description Clears run-location columns in the worker finally (alongside detach). Leaves the
   * cancel marker intact (it is an audit record). Returns the number of rows updated.
   */
  async clearRunLocation(
    queueName: string,
    bullmqJobId: string,
  ): Promise<number> {
    const result = await this.getRepository().update(
      { bullmqJobId, queueName },
      { hostname: null, pid: null, workerId: null },
    );

    return result.affected ?? 0;
  }

  /**
   * @description Stamps the durable cancel-request marker (cancel_requested_at/by) on the plan's
   * NEWEST run row — which is the currently-active run (each enqueue/CLI start inserts a fresh row).
   * Keying on the newest row (rather than "any located run") keeps {@link readCancelRequested}
   * symmetric and prevents a stale marker on an older, finished run from bleeding onto a later run.
   * This is the cross-process/host/CLI stop guarantee: the run loop polls the marker at each
   * iteration boundary. Returns the run id that was marked, or null when the plan has no run row.
   */
  async stampCancelRequested(
    planId: string,
    requestedByUserId: string | null,
  ): Promise<string | null> {
    const repo = this.getRepository();
    const target = await repo.findOne({
      order: { createdAt: 'DESC' },
      where: { planId },
    });

    if (!target) {
      return null;
    }

    await repo.update(
      { id: target.id },
      { cancelRequestedAt: new Date(), cancelRequestedBy: requestedByUserId },
    );

    return target.id;
  }

  /**
   * @description Reads the durable cancel-request marker for a plan's active run (the run loop's
   * iteration-boundary fallback when the pub/sub fast-path message was missed). Scoped to the NEWEST
   * run row so a fresh run never inherits a prior run's marker; returns its marker when set, else
   * null.
   */
  async readCancelRequested(planId: string): Promise<CancelMarker | null> {
    const run = await this.getRepository().findOne({
      order: { createdAt: 'DESC' },
      where: { planId },
    });

    if (!run?.cancelRequestedAt) {
      return null;
    }

    return {
      cancelRequestedAt: run.cancelRequestedAt,
      cancelRequestedBy: run.cancelRequestedBy,
    };
  }

  /**
   * @description Bumps the liveness heartbeat on a run keyed by RUN ID — the CLI path,
   * whose row has a null bullmqJobId that {@link recordHeartbeatByJob} cannot address.
   * Best-effort telemetry: returns the number of rows updated (0 for an unknown id).
   */
  async recordHeartbeatById(planRunId: string): Promise<number> {
    const result = await this.getRepository().update(
      { id: planRunId },
      { lastHeartbeatAt: new Date() },
    );

    return result.affected ?? 0;
  }

  /**
   * @description Bumps the liveness heartbeat on a run keyed by (queueName, bullmqJobId)
   * — the in-server worker path, symmetric with {@link markRunStarted}. Best-effort
   * telemetry: returns the number of rows updated (0 for an unrecorded/legacy run).
   */
  async recordHeartbeatByJob(
    queueName: string,
    bullmqJobId: string,
  ): Promise<number> {
    const result = await this.getRepository().update(
      { bullmqJobId, queueName },
      { lastHeartbeatAt: new Date() },
    );

    return result.affected ?? 0;
  }

  /**
   * @description Settles every OTHER unsupervised (`heartbeat_expected = false`) IN_PROGRESS run
   * on a plan to STALE — the fast path of the unsupervised janitor, called from
   * {@link PlanRunsService.registerCliRun} just before a new unsupervised row is inserted.
   *
   * Two concurrent interactive loops on one plan is not a supported state, and an older row is
   * already functionally dead: {@link PlanRunsService.stampCancelRequested} and
   * {@link PlanRunsService.readCancelRequested} both key on the plan's NEWEST run, so once a newer
   * row exists the older one can no longer even receive a cancel. Leaving it IN_PROGRESS only makes
   * it read as live and hold its worktree busy forever.
   *
   * Deliberately does NOT touch plan or task status — same invariant as the age sweep. Scoped to
   * `heartbeat_expected = false` so a queued or detached-CLI run, which has a timer and a sweeper of
   * its own, is never collateral. Returns the number of rows settled.
   */
  async settleSupersededUnsupervisedRuns(planId: string): Promise<number> {
    const result = await this.getRepository()
      .createQueryBuilder()
      .update(PlanRun)
      .set({
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.STALE,
        workerId: null,
      })
      .where('plan_id = :planId', { planId })
      .andWhere('status = :status', { status: PLAN_RUN_STATUS.IN_PROGRESS })
      .andWhere('NOT heartbeat_expected')
      .execute();

    return result.affected ?? 0;
  }

  /**
   * @description Finds UNSUPERVISED (`heartbeat_expected = false`) IN_PROGRESS runs older than
   * `cutoff` — the exact complement of {@link PlanRunsService.findStaleInProgressRuns}, which
   * excludes them. Together the two cover every IN_PROGRESS row, so no run is left with no janitor.
   *
   * The predicate is age, not silence. These rows have no timer, so `last_heartbeat_at` is stamped
   * once at creation and never bumped; COALESCE with `created_at` therefore reads as "when this run
   * started" rather than "when it was last alive". That is the honest signal to use, and it is why
   * the caller must pass {@link UNSUPERVISED_STALE_CUTOFF_MS} rather than the 120s
   * {@link STALE_CUTOFF_MS}. Oldest-first, capped at `limit`.
   */
  async findStaleUnsupervisedRuns(
    cutoff: Date,
    limit: number,
  ): Promise<PlanRun[]> {
    return this.getRepository()
      .createQueryBuilder('run')
      .where('run.status = :status', { status: PLAN_RUN_STATUS.IN_PROGRESS })
      .andWhere('NOT run.heartbeat_expected')
      .andWhere('COALESCE(run.last_heartbeat_at, run.created_at) < :cutoff', {
        cutoff,
      })
      .orderBy('run.created_at', 'ASC')
      .take(limit)
      .getMany();
  }

  /**
   * @description Finds IN_PROGRESS runs whose liveness is older than `cutoff` — i.e.
   * stranded by a hard crash (SIGKILL/power-loss) that skipped the graceful settle path.
   * Uses COALESCE(last_heartbeat_at, created_at) so rows that never heartbeated (legacy,
   * or crashed before their first tick) are also caught once old enough. Newest-relevant
   * ordering is irrelevant to a sweep, so returns oldest-first, capped at `limit`.
   *
   * Runs with `heartbeat_expected = false` are excluded outright (migration 110): their
   * owner has no timer, so a quiet gap is normal rather than fatal, and sweeping one is
   * not a tidy-up — the sweeper's reconcileStrandedPlan resets the plan and every
   * IN_PROGRESS task to PENDING, destroying live work.
   */
  async findStaleInProgressRuns(
    cutoff: Date,
    limit: number,
  ): Promise<PlanRun[]> {
    return this.getRepository()
      .createQueryBuilder('run')
      .where('run.status = :status', {
        status: PLAN_RUN_STATUS.IN_PROGRESS,
      })
      .andWhere('run.heartbeat_expected')
      .andWhere('COALESCE(run.last_heartbeat_at, run.created_at) < :cutoff', {
        cutoff,
      })
      .orderBy('run.created_at', 'ASC')
      .take(limit)
      .getMany();
  }

  /**
   * @description Finds LIVE IN_PROGRESS runs executing in one of the given checkouts — the
   * mirror image of {@link findStaleInProgressRuns}: same COALESCE(last_heartbeat_at, created_at)
   * liveness expression, but on the fresh side of `cutoff`. A stale IN_PROGRESS row is dead, so it
   * must never be reported as running. Newest first so the most recent run wins per checkout.
   * Returns [] for an empty id list rather than issuing an unbounded query.
   *
   * The cutoff test applies only to runs that heartbeat. For a `heartbeat_expected = false`
   * run (migration 110) there is no timer to read, so IN_PROGRESS *is* the liveness signal —
   * without this a healthy interactive loop's worktree would report idle two minutes in.
   * @public
   */
  async findLiveRunsByCheckoutIds(
    checkoutIds: readonly string[],
    cutoff: Date,
  ): Promise<PlanRun[]> {
    if (checkoutIds.length === 0) return [];

    return this.getRepository()
      .createQueryBuilder('run')
      .where('run.status = :status', { status: PLAN_RUN_STATUS.IN_PROGRESS })
      .andWhere('run.checkout_id IN (:...checkoutIds)', {
        checkoutIds: [...checkoutIds],
      })
      .andWhere(
        '(NOT run.heartbeat_expected OR COALESCE(run.last_heartbeat_at, run.created_at) >= :cutoff)',
        { cutoff },
      )
      .orderBy('run.created_at', 'DESC')
      .getMany();
  }

  /**
   * @description Force-settles ONE unsupervised run to STALE — the human escape hatch behind the
   * UI's "settle this run" affordance, and the answer for every case the age sweep and
   * settle-on-next-register do not catch soon enough.
   *
   * This exists because Kill does not help here. Cancelling an interactive run only stamps the
   * durable cancel marker and waits for the agent to poll it; if that agent is gone, nothing ever
   * reads the marker and the row stays IN_PROGRESS — reading as live and holding its worktree busy
   * — forever. Force-settling writes the terminal status directly.
   *
   * Guarded on BOTH `status = IN_PROGRESS` and `NOT heartbeat_expected`, so it can never touch a
   * heartbeating run (which has a sweeper of its own and may be genuinely live) nor re-settle a
   * terminal row. STALE, not COMPLETED/CANCELLED/FAILED: a human clicking this knows contact was
   * lost, not how the work ended, and `settleCliPlanRun`'s honest-report statuses must stay the
   * agent's to claim. Deliberately does NOT touch plan or task status — same invariant as the sweep.
   *
   * Returns the updated run, or null when the row did not match the guard (already terminal, or
   * heartbeating) — the caller distinguishes the two by reading the row back.
   */
  async forceSettleUnsupervisedRun(planRunId: string): Promise<PlanRun | null> {
    const repo = this.getRepository();
    const result = await repo
      .createQueryBuilder()
      .update(PlanRun)
      .set({
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.STALE,
        workerId: null,
      })
      .where('id = :planRunId', { planRunId })
      .andWhere('status = :status', { status: PLAN_RUN_STATUS.IN_PROGRESS })
      .andWhere('NOT heartbeat_expected')
      .execute();

    if ((result.affected ?? 0) === 0) {
      return null;
    }

    return repo.findOne({ where: { id: planRunId } });
  }

  /**
   * @description Settles a stale run to the terminal STALE status and clears its
   * run-location columns. Guarded on status = IN_PROGRESS so a concurrent settle (a
   * graceful exit landing between the sweep's find and this update) never clobbers a
   * row that already reached a terminal status. Idempotent. Returns the updated run, or
   * null when the row no longer matched (already settled elsewhere).
   */
  async settleStaleRun(planRunId: string): Promise<PlanRun | null> {
    const repo = this.getRepository();

    await repo.update(
      { id: planRunId, status: PLAN_RUN_STATUS.IN_PROGRESS },
      {
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.STALE,
        workerId: null,
      },
    );

    return repo.findOne({ where: { id: planRunId } });
  }
}
