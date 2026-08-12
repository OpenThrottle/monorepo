/**
 * @description Resolver for Plan queries and mutations. Injects PlansService from @openthrottle/nestjs-repositories and maps Plan entities to PlanObject.
 */

import {
  getPostgresConfig,
  searchPlansBySemanticQuery,
} from '@openthrottle/node-client';
import type { PlanStatusCount } from '@openthrottle/node-client';
import {
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ProfileResponseTime } from '@openthrottle/nestjs-profiling';
import { EmitNotification } from '@openthrottle/nestjs-websockets';
import {
  AUTH_PRINCIPAL_KIND_USER,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import {
  getDefaultPlanRunConfigStorage,
  isPlanStatus,
  parsePlanRunConfigJson,
  planHasCustomRunConfig,
  PLAN_STATUS_LIST,
  PLAN_STATUS_VALUES,
  PlansService,
  PlanRunsService,
  planRunConfigFromPlanStorage,
  resolveCompletedAtForStatusChange,
  serializePlanRunConfigForGraphql,
  serializePlanRunConfigSnapshotForGraphql,
  STALE_CUTOFF_MS,
  TASK_STATUS_VALUES,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { PlanStatus, TaskStatus } from '@openthrottle/nestjs-repositories';
import { PlanTaskStatus } from './plan-task-status.enum';
import type {
  PlanJobRunHooksStorage,
  PlanRun,
  PlanRunConfigStorage,
  PlanRunExecutionBackend,
} from '@openthrottle/nestjs-repositories';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import type { Project, Task } from '@openthrottle/nestjs-repositories';
import { PlanCreationService } from '../../services/plan-creation/plan-creation.service';
import { PlanRunWorktreeCheckoutService } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.service';
import { ProjectObject } from '../projects/project.object';
import { TaskObject } from '../tasks/task.object';
import {
  type EnqueueOutcome,
  PlanEnqueueService,
} from './plan-enqueue.service';
import { PlanStatusService } from './plan-status.service';
import { PlanRulesEvaluationService } from '../../queues/plan-rules/plan-rules-evaluation.service';
import { TaggingEnqueueService } from '../../queues/tagging/tagging-enqueue.service';
import { TAGGING_ENTITY_TYPES } from '../../queues/tagging/tagging.types';
import { PLAN_RULES_TRIGGER_KINDS } from '../../queues/plan-rules/plan-rules.types';
import { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture.service';
import { PlansLoaders } from './plans-loaders';
import {
  parseJobRunHooksJsonInput,
  serializeJobRunHooksForGraphql,
} from './enqueue-plan-job-run-hooks';
import {
  CancelPlanRunInput,
  CreatePlanInput,
  CreatePlansInput,
  DeletePlanInput,
  EnqueuePlanRalphOrchestratorInput,
  EnqueuePlanRunInput,
  ListPlansByStatusInput,
  PlanRalphWorkflowModeGraphQL,
  PlanRunsByPlanIdInput,
  RecordPlanRunHeartbeatInput,
  RegisterCliPlanRunInput,
  RegisterPlanRunWorktreeCheckoutInput,
  SearchPlansInput,
  SetPlanStatusInput,
  SettleCliPlanRunInput,
  UpdatePlanInput,
} from './plan.input';
import {
  CancelPlanRunResultObject,
  CreatePlansResultObject,
  EnqueuePlanRunResultObject,
  EvaluatePlanRulesResultObject,
  ListPlansByStatusResultObject,
  PlanObject,
  PlanRefObject,
  PlanRunObject,
  PlanStatusCountObject,
} from './plan.object';

const DEFAULT_SEARCH_PLANS_LIMIT = 20;
const DEFAULT_PLAN_RUNS_LIMIT = 20;
const MAX_PLAN_RUNS_LIMIT = 100;
/** Default cap for the unpaginated plans() list query so it never full-table-scans. */
const DEFAULT_PLANS_LIMIT = 100;
/** Hard ceiling for plans() even when an explicit limit is supplied. */
const MAX_PLANS_LIMIT = 500;
/**
 * Safety cap for the filter-UI aggregation/distinct queries
 * (planCountsByStatus, listDistinctCategories, listDistinctAuthorsAndAssignees).
 * These power filter dropdowns where the cardinality of distinct
 * statuses/categories/authors/assignees is inherently small; the cap bounds the
 * result set so a degenerate dataset can never stream an unbounded full-scan
 * result back to the client.
 */
const MAX_FILTER_FACET_ROWS = 1000;

/**
 * Minimum length of a normalized (hyphen-stripped) hex prefix before
 * `resolvePlanRef` will run a lookup. Below this we short-circuit to an empty
 * result so tiny fragments (e.g. a single "f") never trigger a scan.
 */
const MIN_PLAN_REF_PREFIX_LEN = 6;
/** Hard cap on rows returned by resolvePlanRef (ambiguous prefixes list top N). */
const MAX_PLAN_REF_MATCHES = 6;
/** A normalized plan-id prefix is hex only (hyphens already stripped). */
const REGEX_HEX_ONLY = /^[0-9a-f]+$/;

/**
 * @description Normalize a user-supplied id fragment for prefix matching:
 * trim, lowercase, strip hyphens. Returns null when the result is too short or
 * contains non-hex characters (so we never build a LIKE scan from junk input).
 */
function normalizePlanRefPrefix(prefix: string): string | null {
  const normalized = prefix.trim().toLowerCase().replace(/-/g, '');

  if (normalized.length < MIN_PLAN_REF_PREFIX_LEN) {
    return null;
  }

  if (!REGEX_HEX_ONLY.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * @description Resolve the actor user id to persist on a run record. Only a user
 * principal's `sub` is a users.id UUID; service-account/system principals have no
 * user actor, so return null (keeps the nullable FK clean).
 */
function resolveActorUserId(
  sub: string | undefined,
  kind: string | undefined,
): string | null {
  return kind === AUTH_PRINCIPAL_KIND_USER ? (sub ?? null) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * @description Narrows an interceptor return value (typed `unknown`) to a
 * resolved {@link PlanObject}. The `@EmitNotification` payload mappers receive
 * the method's return value as `unknown`; these guards replace the previous
 * `as` assertions with runtime shape checks.
 */
function isPlanObject(value: unknown): value is PlanObject {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    typeof value.title === 'string'
  );
}

function isEnqueuePlanRunResult(
  value: unknown,
): value is EnqueuePlanRunResultObject {
  return isRecord(value) && typeof value.planId === 'string';
}

function isCancelPlanRunResult(
  value: unknown,
): value is CancelPlanRunResultObject {
  return (
    isRecord(value) &&
    typeof value.planId === 'string' &&
    Array.isArray(value.removedJobIds)
  );
}

/** @description Narrows a client-supplied backend string to a {@link PlanRunExecutionBackend}. */
function isPlanRunExecutionBackend(
  value: string,
): value is PlanRunExecutionBackend {
  return (
    value === 'claude' ||
    value === 'codex' ||
    value === 'cursor' ||
    value === 'grok' ||
    value === 'opencode'
  );
}

/** @description Terminal statuses a detached-CLI run may be settled to. */
function isTerminalCliRunStatus(value: string): boolean {
  return value === 'CANCELLED' || value === 'COMPLETED' || value === 'FAILED';
}

/**
 * @description Validates that every (already normalized/uppercased) label is a
 * canonical plan status, throwing an actionable BadRequestException listing the
 * valid set. Guards the `status IN (...)` filter and the setPlanStatus mutation
 * so an unknown value never reaches Postgres and surfaces as a raw
 * `invalid input value for enum plan_task_status` error.
 */
function assertValidPlanStatuses(statuses: readonly string[]): void {
  const unknown = statuses.filter((status) => !isPlanStatus(status));
  if (unknown.length > 0) {
    throw new BadRequestException(
      `Unknown plan status: ${unknown
        .map((status) => `"${status}"`)
        .join(', ')}. Valid statuses: ${PLAN_STATUS_LIST}.`,
    );
  }
}

/**
 * @description Derives whether an IN_PROGRESS run is stale (owning process crashed hard,
 * heartbeat gone quiet past the cutoff). Only IN_PROGRESS rows can be stale — a terminal
 * row (COMPLETED/CANCELLED/FAILED/STALE) conveys its state through `status`. Falls back to
 * `createdAt` when the run never heartbeated (legacy/pre-first-tick), matching the sweeper's
 * COALESCE(last_heartbeat_at, created_at) predicate.
 */
function isPlanRunStale(planRun: PlanRun): boolean {
  if (planRun.status !== 'IN_PROGRESS') {
    return false;
  }

  const liveness = planRun.lastHeartbeatAt ?? planRun.createdAt;

  return Date.now() - liveness.getTime() > STALE_CUTOFF_MS;
}

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => PlanObject)
export class PlansResolver {
  constructor(
    private readonly loaders: PlansLoaders,
    private readonly planCreationService: PlanCreationService,
    private readonly planEnqueueService: PlanEnqueueService,
    private readonly planRulesEvaluationService: PlanRulesEvaluationService,
    private readonly planRunsService: PlanRunsService,
    private readonly planRunWorktreeCheckoutService: PlanRunWorktreeCheckoutService,
    private readonly planStatusService: PlanStatusService,
    private readonly plansService: PlansService,
    private readonly taggingEnqueueService: TaggingEnqueueService,
    private readonly tasksService: TasksService,
    private readonly workLedgerCapture: WorkLedgerCaptureService,
  ) {}

  private toEnqueueResult(outcome: EnqueueOutcome): EnqueuePlanRunResultObject {
    const result = new EnqueuePlanRunResultObject();

    result.executionBackend = outcome.executionBackend;
    result.jobId = outcome.jobId;
    result.planId = outcome.planId;
    result.queuePosition = outcome.queuePosition;
    result.queueTotal = outcome.queueTotal;

    return result;
  }

  // @ProfileResponseTime('PlansResolver.projectRelation')
  @ResolveField(() => ProjectObject, {
    description: `Resolved project entity when projectId is set`,
    nullable: true,
  })
  async projectRelation(@Parent() parent: PlanObject): Promise<Project | null> {
    if (!parent.projectId) return null;

    return this.loaders.projectLoader.load(parent.projectId);
  }

  @ResolveField(() => String, {
    description: `Job-run lifecycle hooks stored on the plan ({ hooks: [...] }).`,
  })
  jobRunHooksJson(
    @Parent()
    parent: PlanObject & { jobRunHooks?: PlanJobRunHooksStorage | null },
  ): string {
    const stored = parent.jobRunHooks;
    if (stored !== undefined && stored !== null) {
      return serializeJobRunHooksForGraphql(stored);
    }
    return serializeJobRunHooksForGraphql({ hooks: [] });
  }

  @ResolveField(() => String, {
    description: `Workflow-ralph run configuration stored on the plan (PlanRunConfigStorage v1).`,
  })
  runConfigJson(
    @Parent()
    parent: PlanObject & { runConfig?: PlanRunConfigStorage | null },
  ): string {
    const stored = parent.runConfig;
    return serializePlanRunConfigForGraphql(stored, { planId: parent.id });
  }

  @ResolveField(() => Boolean, {
    description: `True when saved workflow run configuration differs from canonical defaults.`,
  })
  hasCustomRunConfig(
    @Parent()
    parent: PlanObject & { runConfig?: PlanRunConfigStorage | null },
  ): boolean {
    const stored = parent.runConfig;
    return planHasCustomRunConfig(stored, { planId: parent.id });
  }

  // @ProfileResponseTime('PlansResolver.taskCount')
  @ResolveField(() => Int, {
    description: 'Number of tasks belonging to this plan',
  })
  async taskCount(@Parent() parent: PlanObject): Promise<number> {
    return this.loaders.taskCountByPlanIdLoader.load(parent.id);
  }

  @ResolveField(() => [TaskObject], {
    description: `Plan-level before-hooks (beforeAll, or beforeEach when scope='each'), in execution order.`,
  })
  async beforeHooks(@Parent() parent: PlanObject): Promise<Task[]> {
    return (await this.tasksService.getPlanHooks(parent.id)).before;
  }

  @ResolveField(() => [TaskObject], {
    description: `Plan-level after-hooks (afterAll, or afterEach when scope='each'), in execution order.`,
  })
  async afterHooks(@Parent() parent: PlanObject): Promise<Task[]> {
    return (await this.tasksService.getPlanHooks(parent.id)).after;
  }

  private mapPlanRunObject(planRun: PlanRun): PlanRunObject {
    const out = new PlanRunObject();

    out.branch = planRun.branch;
    out.bullmqJobId = planRun.bullmqJobId;
    out.cancelRequestedAt = planRun.cancelRequestedAt;
    out.checkoutId = planRun.checkoutId;
    out.createdAt = planRun.createdAt;
    out.executionBackend = planRun.executionBackend;
    out.hostname = planRun.hostname;
    out.id = planRun.id;
    out.model = planRun.model;
    out.isStale = isPlanRunStale(planRun);
    out.lastHeartbeatAt = planRun.lastHeartbeatAt;
    out.pid = planRun.pid;
    out.planId = planRun.planId;
    out.queueName = planRun.queueName;
    out.runConfigSnapshotJson = serializePlanRunConfigSnapshotForGraphql(
      planRun.runConfigSnapshot,
    );
    out.runKind = planRun.runKind;
    out.status = planRun.status;
    out.updatedAt = planRun.updatedAt;
    out.workerId = planRun.workerId;

    return out;
  }

  @Query(() => [PlanRunObject], {
    description: `Recent persisted Ralph plan runs for a plan, newest first. Each row stores exactly one execution backend.`,
  })
  async planRunsByPlanId(
    @Args('input', { type: () => PlanRunsByPlanIdInput })
    input: PlanRunsByPlanIdInput,
  ): Promise<PlanRunObject[]> {
    const effectiveLimit = Math.min(
      Math.max(1, input.limit ?? DEFAULT_PLAN_RUNS_LIMIT),
      MAX_PLAN_RUNS_LIMIT,
    );
    const runs = await this.planRunsService.findRecentByPlanId(
      input.planId,
      effectiveLimit,
    );

    return runs.map((run) => this.mapPlanRunObject(run));
  }

  @Mutation(() => PlanRunObject, {
    description: `Register a detached workflow-ralph CLI run as a first-class plan_runs row (bullmqJobId NULL, runKind 'orchestrator', status IN_PROGRESS) so cancelPlanRun has a row to stamp the durable cancel marker on. Creates NO BullMQ job. The CLI calls this on start, polls the marker each iteration boundary, and settles the row via settleCliPlanRun on exit.`,
  })
  async registerCliPlanRun(
    @Args('input', { type: () => RegisterCliPlanRunInput })
    input: RegisterCliPlanRunInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<PlanRunObject> {
    if (!isPlanRunExecutionBackend(input.executionBackend)) {
      throw new BadRequestException(
        `Invalid executionBackend: ${input.executionBackend} (expected claude, codex, cursor, grok, or opencode)`,
      );
    }

    const run = await this.planRunsService.registerCliRun({
      actorUserId: resolveActorUserId(actorSub, actorKind),
      branch: input.branch ?? null,
      executionBackend: input.executionBackend,
      hostname: input.hostname ?? null,
      pid: input.pid ?? null,
      planId: input.planId,
      workerId: input.workerId ?? null,
    });

    return this.mapPlanRunObject(run);
  }

  @Mutation(() => PlanRunObject, {
    description: `Settle a detached-CLI run row (from registerCliPlanRun) on exit: set the terminal status (COMPLETED, CANCELLED, or FAILED) and clear the run-location columns. Keyed on the run id. Returns null when the row no longer exists.`,
    nullable: true,
  })
  async settleCliPlanRun(
    @Args('input', { type: () => SettleCliPlanRunInput })
    input: SettleCliPlanRunInput,
  ): Promise<PlanRunObject | null> {
    const status = input.status.trim().toUpperCase();

    if (!isTerminalCliRunStatus(status)) {
      throw new BadRequestException(
        `Invalid settle status: ${input.status} (expected COMPLETED, CANCELLED, or FAILED)`,
      );
    }

    const run = await this.planRunsService.settleCliRun(
      input.planRunId,
      status,
    );

    return run ? this.mapPlanRunObject(run) : null;
  }

  @Mutation(() => PlanRunObject, {
    description: `Bump the liveness heartbeat on a detached-CLI run row (from registerCliPlanRun). The CLI calls this on a ~15s timer so a hard crash (SIGKILL/power-loss) leaves a stale heartbeat the reader/sweeper can detect. Keyed on the run id. Returns null when the row no longer exists.`,
    nullable: true,
  })
  async recordPlanRunHeartbeat(
    @Args('input', { type: () => RecordPlanRunHeartbeatInput })
    input: RecordPlanRunHeartbeatInput,
  ): Promise<PlanRunObject | null> {
    await this.planRunsService.recordHeartbeatById(input.planRunId);

    const run = await this.planRunsService.findById(input.planRunId);

    return run ? this.mapPlanRunObject(run) : null;
  }

  @Mutation(() => PlanRunObject, {
    description: `Best-effort register of a linked git worktree as a repository_checkout for the run actor, then back-fill plan_runs.checkout_id when still NULL. Soft-fails (returns the run unchanged) when the path is not a linked worktree, repository resolution fails, or upsert errors. Requires a user JWT (not a service-account token). Returns null when the plan-run row does not exist.`,
    nullable: true,
  })
  async registerPlanRunWorktreeCheckout(
    @Args('input', { type: () => RegisterPlanRunWorktreeCheckoutInput })
    input: RegisterPlanRunWorktreeCheckoutInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<PlanRunObject | null> {
    const actorUserId = resolveActorUserId(actorSub, actorKind);
    if (actorUserId === null) {
      throw new ForbiddenException(
        'registerPlanRunWorktreeCheckout requires a user JWT (service-account tokens are not allowed)',
      );
    }

    const run = await this.planRunWorktreeCheckoutService.register({
      filesystemPath: input.filesystemPath,
      planRunId: input.planRunId,
      userId: actorUserId,
    });

    return run ? this.mapPlanRunObject(run) : null;
  }

  // @ProfileResponseTime('PlansResolver.plan')
  @Query(() => PlanObject, {
    description: `Get a plan by ID`,
    nullable: true,
  })
  async plan(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<PlanObject | null> {
    const entity = await this.plansService
      .getRepository()
      .findOne({ where: { id } });

    return entity;
  }

  // @ProfileResponseTime('PlansResolver.resolvePlanRef')
  @Query(() => [PlanRefObject], {
    description: `Resolve a short plan-id fragment (leading hex of a full UUID, e.g. "f5e40886") to matching plan refs. Normalizes the prefix (trim/lowercase/strip hyphens); prefixes shorter than ${MIN_PLAN_REF_PREFIX_LEN} hex chars or containing non-hex characters return []. A unique match powers a confident ⌘K redirect; multiple matches (up to ${MAX_PLAN_REF_MATCHES}) are listed for disambiguation.`,
  })
  async resolvePlanRef(
    @Args('prefix', { type: () => String }) prefix: string,
  ): Promise<PlanRefObject[]> {
    const normalized = normalizePlanRefPrefix(prefix);

    if (!normalized) {
      return [];
    }

    // Compare against the hyphen-stripped id so a fragment that spans a UUID
    // hyphen boundary (e.g. "f5e4088636d3") still matches. `normalized` is
    // validated hex-only, so the LIKE pattern carries no wildcard metacharacters;
    // the value is still passed as a bound param.
    const rows = await this.plansService
      .getRepository()
      .createQueryBuilder('plan')
      .select(['plan.id', 'plan.status', 'plan.title'])
      .where(`REPLACE(plan.id::text, '-', '') ILIKE :pattern`, {
        pattern: `${normalized}%`,
      })
      .orderBy('plan.updatedAt', 'DESC')
      .take(MAX_PLAN_REF_MATCHES)
      .getMany();

    return rows.map((row) => {
      const ref = new PlanRefObject();

      ref.id = row.id;
      ref.status = row.status;
      ref.title = row.title;

      return ref;
    });
  }

  // @ProfileResponseTime('PlansResolver.plans')
  @Query(() => [PlanObject], {
    description: `List plans, newest first. Capped at ${DEFAULT_PLANS_LIMIT} by default (max ${MAX_PLANS_LIMIT}); pass limit to override. Use listPlansByStatus for full pagination/filtering.`,
  })
  async plans(
    @Args('limit', { nullable: true, type: () => Int })
    limit?: number | null,
  ): Promise<PlanObject[]> {
    const effectiveLimit = Math.min(
      Math.max(1, limit ?? DEFAULT_PLANS_LIMIT),
      MAX_PLANS_LIMIT,
    );
    const entities = await this.plansService.getRepository().find({
      order: { createdAt: 'DESC' },
      take: effectiveLimit,
    });

    return entities;
  }

  // @ProfileResponseTime('PlansResolver.listPlansByStatus')
  @Query(() => ListPlansByStatusResultObject, {
    description: `List plans filtered by status(es), assignee(s), project, title; sorted and paginated. Pass statuses/assignees arrays; empty or "all" in statuses means no status filter.`,
  })
  async listPlansByStatus(
    @Args('input', { type: () => ListPlansByStatusInput })
    input: ListPlansByStatusInput,
  ): Promise<ListPlansByStatusResultObject> {
    const repo = this.plansService.getRepository();
    const orderColumn = input.sortBy === 'updated' ? 'updatedAt' : 'createdAt';
    const orderDir = input.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const take = input.limit ?? 20;
    const skip = input.offset ?? 0;
    // Merge the typed `statusesEnum` (already canonical) with the deprecated
    // free-string `statuses` (normalized to uppercase). Dedupe so the IN (...)
    // clause carries each status once.
    const statusList = [
      ...new Set([
        ...(input.statusesEnum ?? []),
        ...(input.statuses
          ?.filter((s) => s != null && String(s).trim() !== '')
          .map((s) => String(s).trim().toUpperCase()) ?? []),
      ]),
    ];

    const showAllStatuses =
      statusList.length === 0 ||
      input.statuses?.some((s) => String(s).trim().toLowerCase() === 'all');

    const assigneeList =
      input.assignees
        ?.filter((a) => a != null && String(a).trim() !== '')
        .map((a) => String(a).trim()) ?? [];

    const qb = repo
      .createQueryBuilder('plan')
      .select([
        'plan.assignee',
        'plan.author',
        'plan.category',
        'plan.createdAt',
        'plan.id',
        'plan.project',
        'plan.projectId',
        'plan.status',
        'plan.summary',
        'plan.title',
        'plan.updatedAt',
      ])
      .orderBy(`plan.${orderColumn}`, orderDir)
      .take(take)
      .skip(skip);

    // Use explicit param names (e.g. status_0, status_1) instead of :...statuses so TypeORM binds arrays correctly.
    if (!showAllStatuses && statusList.length > 0) {
      assertValidPlanStatuses(statusList);
      const statusParams = statusList.map((_, i) => `status_${i}`);
      qb.andWhere(
        `plan.status IN (${statusParams.map((p) => `:${p}`).join(', ')})`,
        Object.fromEntries(
          statusList.map((s, i) => [`status_${i}`, String(s).trim()]),
        ),
      );
    }

    if (assigneeList.length > 0) {
      const assigneeParams = assigneeList.map((_, i) => `assignee_${i}`);
      const placeholders = assigneeParams.map((p) => `:${p}`).join(', ');

      qb.andWhere(
        `(plan.author IN (${placeholders}) OR plan.assignee IN (${placeholders}))`,
        Object.fromEntries(assigneeList.map((a, i) => [`assignee_${i}`, a])),
      );
    }

    if (input.project?.trim()) {
      qb.andWhere('plan.project = :project', {
        project: input.project.trim(),
      });
    }

    if (input.projectId?.trim()) {
      qb.andWhere('plan.projectId = :projectId', {
        projectId: input.projectId.trim(),
      });
    }

    if (input.titleSubstring?.trim()) {
      qb.andWhere('plan.title ILIKE :titlePattern', {
        titlePattern: `%${input.titleSubstring.trim()}%`,
      });
    }

    const [entities, totalCount] = await qb.getManyAndCount();
    const result = new ListPlansByStatusResultObject();

    result.plans = entities;
    result.totalCount = totalCount;

    return result;
  }

  // @ProfileResponseTime('PlansResolver.listPlanCountsByStatus')
  @Query(() => [PlanStatusCountObject], {
    description: `Plan count per status for sidebar/filters (alias: use planCountsByStatus)`,
  })
  async listPlanCountsByStatus(): Promise<PlanStatusCount[]> {
    return this.fetchPlanCountsByStatus();
  }

  // @ProfileResponseTime('PlansResolver.planCountsByStatus')
  @Query(() => [PlanStatusCountObject], {
    description: `Plan count per status for sidebar/filters`,
  })
  async planCountsByStatus(): Promise<PlanStatusCount[]> {
    return this.fetchPlanCountsByStatus();
  }

  // @ProfileResponseTime('PlansResolver.searchPlans')
  @Query(() => ListPlansByStatusResultObject, {
    description: `Semantic search over plans/tasks (vector similarity). Requires OPENAI_API_KEY or Ollama for query embedding. Returns plans matching the query, deduped by plan id.`,
  })
  async searchPlans(
    @Args('input', { type: () => SearchPlansInput }) input: SearchPlansInput,
  ): Promise<ListPlansByStatusResultObject> {
    const config = getPostgresConfig();

    if (!config) {
      const result = new ListPlansByStatusResultObject();

      result.plans = [];
      result.totalCount = 0;

      return result;
    }

    const result = new ListPlansByStatusResultObject();
    const raw = await searchPlansBySemanticQuery(
      input.query,
      input.limit ?? DEFAULT_SEARCH_PLANS_LIMIT,
    );

    if (
      !raw ||
      !Array.isArray(raw.plans) ||
      typeof raw.totalCount !== 'number'
    ) {
      result.plans = [];
      result.totalCount = 0;
    } else {
      result.plans = raw.plans;
      result.totalCount = raw.totalCount;
    }

    return result;
  }

  private async fetchPlanCountsByStatus(): Promise<PlanStatusCount[]> {
    const repo = this.plansService.getRepository();
    const rows = await repo.query<{ count: number; status: string }[]>(
      `SELECT status, COUNT(*)::int AS count FROM plans GROUP BY status ORDER BY status LIMIT ${MAX_FILTER_FACET_ROWS}`,
    );

    return rows.map((r) => {
      const obj = new PlanStatusCountObject();

      obj.status = r.status;
      obj.count = r.count;

      return obj;
    });
  }

  // @ProfileResponseTime('PlansResolver.listDistinctCategories')
  @Query(() => [String], {
    description: `Distinct category values from plans for filters`,
  })
  async listDistinctCategories(): Promise<string[]> {
    const repo = this.plansService.getRepository();
    const rows = await repo.query<{ category: string }[]>(
      `SELECT DISTINCT category FROM plans ORDER BY category LIMIT ${MAX_FILTER_FACET_ROWS}`,
    );

    return rows.map((r) => r.category);
  }

  // @ProfileResponseTime('PlansResolver.listDistinctAuthorsAndAssignees')
  @Query(() => [String], {
    description: `Distinct author and assignee values from plans and tasks for filters`,
  })
  async listDistinctAuthorsAndAssignees(): Promise<string[]> {
    const repo = this.plansService.getRepository();
    const rows = await repo.query<{ person: string }[]>(
      `(SELECT author AS person FROM plans)
       UNION
       (SELECT assignee AS person FROM plans WHERE assignee IS NOT NULL)
       UNION
       (SELECT assignee AS person FROM tasks WHERE assignee IS NOT NULL)
       ORDER BY person
       LIMIT ${MAX_FILTER_FACET_ROWS}`,
    );

    return rows.map((r) => r.person);
  }

  @Query(() => [PlanTaskStatus], {
    description: `The canonical set of valid plan statuses (introspectable status vocabulary). Includes QUEUED (plans-only).`,
  })
  planStatuses(): PlanStatus[] {
    return [...PLAN_STATUS_VALUES];
  }

  @Query(() => [PlanTaskStatus], {
    description: `The canonical set of valid task statuses. Excludes QUEUED, which is plans-only.`,
  })
  taskStatuses(): TaskStatus[] {
    return [...TASK_STATUS_VALUES];
  }

  // @ProfileResponseTime('PlansResolver.createPlan')
  @Mutation(() => PlanObject, {
    description: `Create a plan`,
  })
  @EmitNotification(NOTIFICATION_EVENT_NAMES.PLAN_UPDATED, (ret) =>
    isPlanObject(ret)
      ? {
          message: `Plan created: ${ret.title}`,
          planId: ret.id,
          severity: 'success' as const,
        }
      : null,
  )
  async createPlan(
    @Args('input', { type: () => CreatePlanInput }) input: CreatePlanInput,
  ): Promise<PlanObject> {
    const plan = await this.planCreationService.createPlanFromInput(input);
    await this.planRulesEvaluationService.enqueueEvaluation(
      plan.id,
      PLAN_RULES_TRIGGER_KINDS.PLAN_CREATED,
    );
    await this.taggingEnqueueService.enqueuePredict(
      TAGGING_ENTITY_TYPES.PLAN,
      plan.id,
    );
    return plan;
  }

  @Mutation(() => CreatePlansResultObject, {
    description: `Create many plans atomically in a single transaction. Every input is validated up front (same rules as createPlan); a single invalid input or DB failure rolls back the whole batch.`,
  })
  async createPlans(
    @Args('input', { type: () => CreatePlansInput }) input: CreatePlansInput,
  ): Promise<CreatePlansResultObject> {
    const plans = await this.planCreationService.createPlansFromInput(
      input.plans,
    );
    await Promise.all(
      plans.map((plan) =>
        this.planRulesEvaluationService.enqueueEvaluation(
          plan.id,
          PLAN_RULES_TRIGGER_KINDS.PLAN_CREATED,
        ),
      ),
    );
    await Promise.all(
      plans.map((plan) =>
        this.taggingEnqueueService.enqueuePredict(
          TAGGING_ENTITY_TYPES.PLAN,
          plan.id,
        ),
      ),
    );

    return { plans, totalCount: plans.length };
  }

  // @ProfileResponseTime('PlansResolver.updatePlan')
  @Mutation(() => PlanObject, {
    description: `Update a plan`,
    nullable: true,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        isPlanObject(ret)
          ? {
              message: `Plan updated: ${ret.title}`,
              planId: ret.id,
              severity: 'info' as const,
            }
          : null,
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        isPlanObject(ret)
          ? {
              planId: ret.id,
              status: ret.status,
            }
          : null,
    },
  ])
  async updatePlan(
    @Args('input', { type: () => UpdatePlanInput }) input: UpdatePlanInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<PlanObject | null> {
    const repo = this.plansService.getRepository();
    const entity = await repo.findOne({ where: { id: input.id } });

    if (!entity) return null;

    const inProgressBlocked = this.planStatusService.isInProgressBlocked(
      entity.status,
      input.status,
    );

    let statusChanged = false;
    let statusChangeFrom: string | null = null;
    let touched = false;

    if (input.author != null && input.author !== entity.author) {
      entity.author = input.author;
      touched = true;
    }
    if (input.category != null && input.category !== entity.category) {
      entity.category = input.category;
      touched = true;
    }
    if (input.status != null) {
      const change = this.planStatusService.resolveStatusChange(
        entity.status,
        input.status,
      );
      if (change) {
        const previousStatus = entity.status;
        entity.status = change.nextStatus;
        entity.completedAt = resolveCompletedAtForStatusChange({
          currentCompletedAt: entity.completedAt,
          nextStatus: change.nextStatus,
          previousStatus,
        });
        statusChanged = true;
        statusChangeFrom = previousStatus;
        touched = true;
      }
    }
    if (input.title != null && input.title !== entity.title) {
      entity.title = input.title;
      touched = true;
    }

    if (input.assignee !== undefined && input.assignee !== entity.assignee) {
      entity.assignee = input.assignee;
      touched = true;
    }
    if (
      input.description !== undefined &&
      input.description !== entity.description
    ) {
      entity.description = input.description;
      touched = true;
    }
    if (input.project !== undefined && input.project !== entity.project) {
      entity.project = input.project;
      touched = true;
    }
    if (input.projectId !== undefined && input.projectId !== entity.projectId) {
      entity.projectId = input.projectId;
      touched = true;
    }
    if (input.summary !== undefined && input.summary !== entity.summary) {
      entity.summary = input.summary;
      touched = true;
    }
    if (input.jobRunHooksJson !== undefined) {
      if (input.jobRunHooksJson === null) {
        const hookCount = entity.jobRunHooks?.hooks?.length ?? 0;
        if (hookCount > 0) {
          entity.jobRunHooks = { hooks: [] };
          touched = true;
        }
      } else {
        const parsed = parseJobRunHooksJsonInput(input.jobRunHooksJson);
        const next = parsed ?? { hooks: [] };
        const prevJson = JSON.stringify(entity.jobRunHooks);
        const nextJson = JSON.stringify(next);
        if (prevJson !== nextJson) {
          entity.jobRunHooks = next;
          touched = true;
        }
      }
    }
    if (input.runConfigJson !== undefined) {
      const next = parsePlanRunConfigJson(input.runConfigJson);
      if (next !== undefined) {
        const resolved =
          input.runConfigJson === null
            ? getDefaultPlanRunConfigStorage({ planId: entity.id })
            : next;
        const prevJson = JSON.stringify(
          planRunConfigFromPlanStorage(entity.runConfig, {
            planId: entity.id,
          }),
        );
        const nextJson = JSON.stringify(resolved);
        if (prevJson !== nextJson) {
          entity.runConfig = resolved;
          touched = true;
        }
      }
    }

    if (!touched && inProgressBlocked) {
      throw new BadRequestException(
        this.planStatusService.forbiddenTransitionMessage,
      );
    }

    if (!touched) {
      return entity;
    }

    // Status fact + completed_at commit together with the status_change ledger row (G12).
    const saved = await repo.manager.transaction(async (manager) => {
      const persisted = await manager.save(entity);

      if (statusChanged) {
        await this.workLedgerCapture.recordStatusChange(manager, {
          actorKind,
          actorSub,
          entity: 'plan',
          from: statusChangeFrom,
          id: persisted.id,
          planId: persisted.id,
          taskId: null,
          to: persisted.status,
        });
      }

      return persisted;
    });

    // Downstream reaction stays outside the transaction (fire-and-forget, as before).
    if (statusChanged) {
      await this.planRulesEvaluationService.enqueueEvaluation(
        saved.id,
        PLAN_RULES_TRIGGER_KINDS.STATUS_CHANGED,
      );
    }
    return saved;
  }

  // @ProfileResponseTime('PlansResolver.setPlanStatus')
  @Mutation(() => PlanObject, {
    description: `Set a plan's status (e.g. COMPLETED). Convenience mutation for Mark Complete; equivalent to updatePlan with { id, status }.`,
    nullable: true,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        isPlanObject(ret)
          ? {
              message: `Plan status updated: ${ret.title} → ${ret.status}`,
              planId: ret.id,
              severity: 'info' as const,
            }
          : null,
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        isPlanObject(ret)
          ? {
              planId: ret.id,
              status: ret.status,
            }
          : null,
    },
  ])
  async setPlanStatus(
    @Args('input', { type: () => SetPlanStatusInput })
    input: SetPlanStatusInput,
  ): Promise<PlanObject | null> {
    const rawStatus = input.statusEnum ?? input.status;
    if (rawStatus == null || String(rawStatus).trim() === '') {
      throw new BadRequestException(
        'setPlanStatus requires either statusEnum or status.',
      );
    }
    const nextStatus = String(rawStatus).trim().toUpperCase();
    assertValidPlanStatuses([nextStatus]);
    const plan = await this.planStatusService.setStatus(
      input.planId,
      nextStatus,
    );
    if (plan != null) {
      await this.planRulesEvaluationService.enqueueEvaluation(
        plan.id,
        PLAN_RULES_TRIGGER_KINDS.STATUS_CHANGED,
      );
    }
    return plan;
  }

  // @ProfileResponseTime('PlansResolver.deletePlan')
  @Mutation(() => Boolean, {
    description: `Delete a plan by ID`,
  })
  async deletePlan(
    @Args('input', { type: () => DeletePlanInput }) input: DeletePlanInput,
  ): Promise<boolean> {
    const repo = this.plansService.getRepository();
    const result = await repo.delete({ id: input.id });

    return (result.affected ?? 0) > 0;
  }

  @Mutation(() => EvaluatePlanRulesResultObject, {
    description: `Manually enqueue a full tag→action rules evaluation pass for a plan. Fire-and-forget: the pass runs async on the plan-rules:evaluate queue and results land in the rule_applications ledger (read via planRuleApplications). The ack only confirms the pass was enqueued.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async evaluatePlanRules(
    @Args('planId', { type: () => ID }) planId: string,
  ): Promise<EvaluatePlanRulesResultObject> {
    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: planId } });

    if (!plan) {
      throw new BadRequestException(`Plan not found: ${planId}`);
    }

    await this.planRulesEvaluationService.enqueueEvaluation(
      planId,
      PLAN_RULES_TRIGGER_KINDS.MANUAL,
    );

    const result = new EvaluatePlanRulesResultObject();
    result.enqueued = true;
    result.planId = planId;
    result.triggerKind = PLAN_RULES_TRIGGER_KINDS.MANUAL;

    return result;
  }

  @ProfileResponseTime('PlansResolver.enqueuePlanRun')
  @Mutation(() => EnqueuePlanRunResultObject, {
    description: `Canonical mutation to enqueue a spawn plan-run job (nested workflow-ralph in the worker). Used by the Developer app "Run plan" action and external clients. Returns job id, plan id, and queue position. For in-process orchestrator runs use enqueuePlanRalphOrchestrator instead.`,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        isEnqueuePlanRunResult(ret)
          ? {
              message: 'Plan queued for run',
              planId: ret.planId,
              severity: 'info' as const,
            }
          : null,
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        isEnqueuePlanRunResult(ret)
          ? {
              planId: ret.planId,
              status: 'QUEUED',
            }
          : null,
    },
  ])
  async enqueuePlanRun(
    @Args('input', { type: () => EnqueuePlanRunInput })
    input: EnqueuePlanRunInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<EnqueuePlanRunResultObject> {
    const outcome = await this.planEnqueueService.enqueueSpawn({
      actorUserId: resolveActorUserId(actorSub, actorKind),
      branch: input.branch,
      checkoutId: input.checkoutId,
      idempotencyKey: input.idempotencyKey ?? null,
      jobRunHooksJson: input.jobRunHooksJson,
      planId: input.planId,
      priority: input.priority,
      ralph: input.ralph,
      repositoryId: input.repositoryId,
      workingDirectory: input.workingDirectory,
    });

    return this.toEnqueueResult(outcome);
  }

  /** Timing is captured by {@link PlansResolver.enqueuePlanRun} (this alias delegates there). */
  @Mutation(() => EnqueuePlanRunResultObject, {
    deprecationReason: `Use enqueuePlanRun. Identical spawn enqueue behavior; retained for backward-compatible clients only.`,
    description: `Deprecated alias for enqueuePlanRun. Enqueues a spawn plan-run job with the same input and result shape.`,
  })
  async workflowPlanRun(
    @Args('input', { type: () => EnqueuePlanRunInput })
    input: EnqueuePlanRunInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<EnqueuePlanRunResultObject> {
    return this.enqueuePlanRun(input, actorSub, actorKind);
  }

  @ProfileResponseTime('PlansResolver.enqueuePlanRalphOrchestrator')
  @Mutation(() => EnqueuePlanRunResultObject, {
    description: `Enqueue an in-process Ralph orchestrator job (GraphQL-backed pipeline, no nested workflow-ralph process). Same queue position and plan/task status updates as enqueuePlanRun.`,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        isEnqueuePlanRunResult(ret)
          ? {
              message: 'Plan queued for run (orchestrator)',
              planId: ret.planId,
              severity: 'info' as const,
            }
          : null,
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        isEnqueuePlanRunResult(ret)
          ? {
              planId: ret.planId,
              status: 'QUEUED',
            }
          : null,
    },
  ])
  async enqueuePlanRalphOrchestrator(
    @Args('input', { type: () => EnqueuePlanRalphOrchestratorInput })
    input: EnqueuePlanRalphOrchestratorInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<EnqueuePlanRunResultObject> {
    const { planId, taskId } = input;

    const mode =
      input.mode === PlanRalphWorkflowModeGraphQL.task
        ? ('task' as const)
        : input.mode === PlanRalphWorkflowModeGraphQL.plan
          ? ('plan' as const)
          : null;

    if (mode === 'task' && (taskId === null || taskId === undefined)) {
      throw new BadRequestException('taskId is required when mode is task');
    }

    if (mode === 'task' && taskId != null) {
      const task = await this.tasksService.getRepository().findOne({
        where: { id: taskId.trim(), planId },
      });
      if (!task) {
        throw new BadRequestException(
          `Task not found for this plan: ${taskId}`,
        );
      }
    }

    const outcome = await this.planEnqueueService.enqueueOrchestrator({
      actorUserId: resolveActorUserId(actorSub, actorKind),
      branch: input.branch,
      checkoutId: input.checkoutId,
      idempotencyKey: input.idempotencyKey ?? null,
      jobRunHooksJson: input.jobRunHooksJson,
      mode,
      planId,
      priority: input.priority,
      ralph: input.ralph,
      repositoryId: input.repositoryId,
      taskId,
      workingDirectory: input.workingDirectory,
    });

    return this.toEnqueueResult(outcome);
  }

  // @ProfileResponseTime('PlansResolver.cancelPlanRun')
  @Mutation(() => CancelPlanRunResultObject, {
    description: `Cancel BullMQ plan-run jobs for a plan: removes waiting or delayed jobs, and signals the worker to stop the Ralph child when a job is active (cannot be removed from Redis without the lock token).`,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) => {
        if (!isCancelPlanRunResult(ret)) return null;
        if (ret.removedJobIds.length > 0) {
          return {
            message: 'Plan run cancelled (removed from queue)',
            planId: ret.planId,
            severity: 'info' as const,
          };
        }
        if (ret.signaledActiveRunToStop) {
          return {
            message: 'Plan run stop requested (Ralph process)',
            planId: ret.planId,
            severity: 'info' as const,
          };
        }
        // Cross-process/CLI: no local controller fired, but the durable cancel marker was stamped
        // (and pub/sub published) — the owning run stops at its next iteration boundary.
        if (ret.cancelRequested) {
          return {
            message:
              'Plan run cancellation requested (stops at next checkpoint)',
            planId: ret.planId,
            severity: 'info' as const,
          };
        }
        return null;
      },
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        isCancelPlanRunResult(ret) && ret.planStatusAfter != null
          ? {
              planId: ret.planId,
              status: ret.planStatusAfter,
            }
          : null,
    },
  ])
  async cancelPlanRun(
    @Args('input', { type: () => CancelPlanRunInput })
    input: CancelPlanRunInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<CancelPlanRunResultObject> {
    const outcome = await this.planStatusService.cancelRun(
      input.planId,
      resolveActorUserId(actorSub, actorKind),
    );

    const out = new CancelPlanRunResultObject();
    out.activeJobIdsCouldNotCancel = outcome.activeJobIdsCouldNotCancel;
    out.cancelRequested = outcome.cancelRequested;
    out.noMatchingJob = outcome.noMatchingJob;
    out.outcome = outcome.outcome;
    out.planId = outcome.planId;
    out.planStatusAfter = outcome.planStatusAfter;
    out.removedJobIds = outcome.removedJobIds;
    out.signaledActiveRunToStop = outcome.signaledActiveRunToStop;

    return out;
  }
}
