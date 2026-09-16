/**
 * @description Work-ledger GraphQL resolver: session/artifact/subject writes + reads.
 * @authz-stance: authenticated-only. Actor is stamped from the request principal (never an input);
 * exactly one of actor_user_id / actor_service_account_id is set (design §2.1, mirrors the DB CHECK).
 * Per-session ownership checks on write ops are deferred to slice 3 (X-OT-Session-Id / G11).
 */

import { BadRequestException } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import type {
  WorkArtifact,
  WorkSession,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';
import {
  WORK_ARTIFACT_SOURCE,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import { In, IsNull } from 'typeorm';

import {
  ARTIFACT_IDENTITY,
  resolveArtifactForWrite,
} from './artifact-type-registry.ts';
import {
  AttachWorkSessionSubjectInput,
  EndWorkSessionInput,
  RecordWorkArtifactInput,
  StartWorkSessionInput,
  UnverifiedWorkArtifactsInput,
  WorkArtifactsByPlanInput,
  WorkArtifactsBySessionInput,
  WorkArtifactsByTaskInput,
  WorkLedgerCompletenessInput,
  WorkSessionsByPlanInput,
} from './work-ledger.input.ts';
import {
  WorkArtifactListResult,
  WorkArtifactObject,
  WorkLedgerCompletenessResult,
  WorkLedgerPlanCompletenessObject,
  WorkSessionListResult,
  WorkSessionObject,
  WorkSessionSubjectObject,
} from './work-ledger.object.ts';

const DEFAULT_UNVERIFIED_LIMIT = 100;
const MAX_UNVERIFIED_LIMIT = 500;
const DEFAULT_COMPLETENESS_LIMIT = 100;
const MAX_COMPLETENESS_LIMIT = 1000;

/**
 * Per-plan git-work completeness. `recorded` is the strict test: at least one linked git_commit
 * the verifier confirmed reachable on the default branch, evidenced by a stored `landedSha`.
 *
 * Reachability is read from the verifier's own conclusion rather than re-derived here — it stamps
 * `landedSha` exactly when it confirmed the commit (or its squash) is on the branch, so there is no
 * second, divergent notion of "landed" and no git shell-out or per-row GitHub call on a read path.
 */
const PLAN_COMPLETENESS_SQL = `
  SELECT
    g.plan_id                         AS "planId",
    p.title                           AS "planTitle",
    p.status                          AS "planStatus",
    g.artifact_count::int             AS "artifactCount",
    g.recorded                        AS "recorded"
  FROM (
    SELECT
      s.plan_id,
      count(*) AS artifact_count,
      bool_or(
        a.lifecycle = 'landed'
        AND a.verification = 'verified'
        AND a.payload->>'landedSha' IS NOT NULL
      ) AS recorded
    FROM work_session_subjects s
    JOIN work_artifacts a
      ON a.session_id = s.session_id
     AND a.type = 'git_commit'
    GROUP BY s.plan_id
  ) g
  JOIN plans p ON p.id = g.plan_id
  ORDER BY g.recorded ASC, g.artifact_count DESC, p.title ASC
`;

interface PlanCompletenessRow {
  readonly artifactCount: number;
  readonly planId: string;
  readonly planStatus: string;
  readonly planTitle: string;
  readonly recorded: boolean;
}

interface ActorColumns {
  actorServiceAccountId: string | null;
  actorUserId: string | null;
}

/**
 * @description Map the authenticated principal to the one-actor columns. Exactly one is non-null;
 * throws when the request has no resolvable principal (should not happen under the global auth guard).
 */
function resolveActorColumns(
  sub: string | undefined,
  kind: string | undefined,
): ActorColumns {
  if (kind === AUTH_PRINCIPAL_KIND_USER && sub != null) {
    return { actorServiceAccountId: null, actorUserId: sub };
  }

  if (kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT && sub != null) {
    return { actorServiceAccountId: sub, actorUserId: null };
  }

  throw new BadRequestException(
    'Cannot record work-ledger session: unresolved authentication principal.',
  );
}

function parsePayloadJson(payloadJson: string): unknown {
  try {
    return JSON.parse(payloadJson);
  } catch {
    throw new BadRequestException('payloadJson is not valid JSON.');
  }
}

@Resolver(() => WorkArtifactObject)
export class WorkLedgerResolver {
  constructor(private readonly workLedgerService: WorkLedgerService) {}

  @ResolveField(() => String, {
    description: `JSON-serialized per-type payload`,
    name: 'payloadJson',
  })
  payloadJson(@Parent() artifact: WorkArtifact): string {
    return JSON.stringify(artifact.payload);
  }

  @Mutation(() => WorkSessionObject)
  async startWorkSession(
    @Args('input') input: StartWorkSessionInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<WorkSession> {
    const actor = resolveActorColumns(actorSub, actorKind);
    const repo = this.workLedgerService.getSessionRepository();
    const entity = repo.create({
      ...actor,
      conversationId: input.conversationId,
      externalRef: input.externalRef,
      model: input.model,
      onBehalfOfUserId: input.onBehalfOfUserId,
      // v1: on_behalf_of via this mutation is always an unverified hint (design §2.3).
      // Ralph's verified inheritance is stamped on its own write path (slice 4).
      onBehalfOfVerified: false,
      planRunId: input.planRunId,
      // started_at is NOT NULL DEFAULT NOW() in the DB, but a DB default is not read back by
      // save(), which would leave the returned entity's non-nullable startedAt undefined and
      // fail the GraphQL projection for a row that was written fine. Stamp it here instead.
      startedAt: new Date(),
      toolName: input.toolName,
      toolVersion: input.toolVersion,
    });

    return repo.save(entity);
  }

  @Mutation(() => WorkArtifactObject)
  async recordWorkArtifact(
    @Args('input') input: RecordWorkArtifactInput,
  ): Promise<WorkArtifact> {
    const resolved = resolveArtifactForWrite(
      input.type,
      parsePayloadJson(input.payloadJson),
    );
    const repo = this.workLedgerService.getArtifactRepository();

    if (resolved.identity === ARTIFACT_IDENTITY.IDEMPOTENT) {
      // Deliberately NOT scoped to the reporting session. uq_work_artifacts_type_external_key
      // is global for idempotent types, so a session-scoped lookup would miss an artifact
      // another session already recorded and then fail the insert against the index.
      const existing = await repo.findOne({
        where: { externalKey: resolved.externalKey, type: input.type },
      });

      if (existing) {
        // The commit is one row; the plans it closes are subjects. When a different session
        // reports the same commit, its subjects have to follow the artifact or the reporting
        // session's plans silently lose their link to it — the same (commit, plan) pair loss
        // migration 118 exists to undo.
        if (existing.sessionId !== input.sessionId) {
          await this.mirrorSubjects(input.sessionId, existing.sessionId);
        }

        // Promote payload/message; never regress lifecycle or verification (the verifier owns those).
        existing.payload = resolved.payload;
        existing.message = input.message ?? existing.message;
        return repo.save(existing);
      }
    }

    const entity = repo.create({
      externalKey: resolved.externalKey,
      lifecycle: resolved.initialLifecycle,
      message: input.message,
      payload: resolved.payload,
      // Set produced_at explicitly (mirrors work-ledger-capture.service.ts): the DB
      // column defaults to now(), but repo.save(repo.create(...)) does not reflect a
      // DB default back onto the returned entity, so the non-nullable
      // WorkArtifactObject.producedAt would resolve to null on the create path.
      producedAt: new Date(),
      sessionId: input.sessionId,
      source: WORK_ARTIFACT_SOURCE.AGENT,
      type: input.type,
    });

    return repo.save(entity);
  }

  @Mutation(() => WorkSessionSubjectObject)
  async attachWorkSessionSubject(
    @Args('input') input: AttachWorkSessionSubjectInput,
  ): Promise<WorkSessionSubject> {
    const repo = this.workLedgerService.getSubjectRepository();
    const existing = await repo.findOne({
      where: {
        planId: input.planId,
        sessionId: input.sessionId,
        // Match IS NULL for plan-level subjects (mirrors the COALESCE-sentinel unique index).
        taskId: input.taskId == null ? IsNull() : input.taskId,
      },
    });

    if (existing) return existing;

    const entity = repo.create({
      planId: input.planId,
      sessionId: input.sessionId,
      taskId: input.taskId,
    });

    return repo.save(entity);
  }

  @Mutation(() => WorkSessionObject, { nullable: true })
  async endWorkSession(
    @Args('input') input: EndWorkSessionInput,
  ): Promise<WorkSession | null> {
    const repo = this.workLedgerService.getSessionRepository();
    const entity = await repo.findOne({ where: { id: input.sessionId } });

    if (!entity) return null;

    // Idempotent close: don't reopen or overwrite an already-closed session.
    if (entity.endedAt == null) {
      entity.endedAt = new Date();
      entity.closedBy = 'explicit';
    }

    if (input.summary != null) entity.summary = input.summary;

    return repo.save(entity);
  }

  @Query(() => WorkSessionObject, { nullable: true })
  async workSession(@Args('id') id: string): Promise<WorkSession | null> {
    return this.workLedgerService
      .getSessionRepository()
      .findOne({ where: { id } });
  }

  @Query(() => WorkSessionListResult)
  async workSessionsByPlan(
    @Args('input') input: WorkSessionsByPlanInput,
  ): Promise<WorkSessionListResult> {
    const subjects = await this.workLedgerService
      .getSubjectRepository()
      .find({ where: { planId: input.planId } });
    const sessionIds = [
      ...new Set(subjects.map((subject) => subject.sessionId)),
    ];

    if (sessionIds.length === 0) return { sessions: [], totalCount: 0 };

    const sessions = await this.workLedgerService
      .getSessionRepository()
      .find({ order: { startedAt: 'DESC' }, where: { id: In(sessionIds) } });

    return { sessions, totalCount: sessions.length };
  }

  @Query(() => WorkArtifactListResult)
  async workArtifactsBySession(
    @Args('input') input: WorkArtifactsBySessionInput,
  ): Promise<{ artifacts: WorkArtifact[]; totalCount: number }> {
    const artifacts = await this.workLedgerService
      .getArtifactRepository()
      .find({
        order: { producedAt: 'ASC' },
        where: { sessionId: input.sessionId },
      });

    return { artifacts, totalCount: artifacts.length };
  }

  @Query(() => WorkArtifactListResult)
  async workArtifactsByPlan(
    @Args('input') input: WorkArtifactsByPlanInput,
  ): Promise<{ artifacts: WorkArtifact[]; totalCount: number }> {
    const subjects = await this.workLedgerService
      .getSubjectRepository()
      .find({ where: { planId: input.planId } });

    return this.artifactsForSessions(subjects.map((s) => s.sessionId));
  }

  @Query(() => WorkArtifactListResult)
  async workArtifactsByTask(
    @Args('input') input: WorkArtifactsByTaskInput,
  ): Promise<{ artifacts: WorkArtifact[]; totalCount: number }> {
    const subjects = await this.workLedgerService
      .getSubjectRepository()
      .find({ where: { taskId: input.taskId } });

    return this.artifactsForSessions(subjects.map((s) => s.sessionId));
  }

  /** Fetch artifacts for a set of session ids (deduped); newest first. Empty set → empty result. */
  private async artifactsForSessions(
    sessionIds: readonly string[],
  ): Promise<{ artifacts: WorkArtifact[]; totalCount: number }> {
    const ids = [...new Set(sessionIds)];
    if (ids.length === 0) return { artifacts: [], totalCount: 0 };

    const artifacts = await this.workLedgerService
      .getArtifactRepository()
      .find({ order: { producedAt: 'DESC' }, where: { sessionId: In(ids) } });

    return { artifacts, totalCount: artifacts.length };
  }

  /**
   * @description How much of the ledger's git half is actually true. Counts plans with at least one
   * verifier-confirmed landed commit against plans the ledger knows have git work, and lists the
   * ones that come up short. See WorkLedgerCompletenessResult for the strict definition and the
   * denominator caveat.
   */
  @Query(() => WorkLedgerCompletenessResult)
  async workLedgerCompleteness(
    @Args('input') input: WorkLedgerCompletenessInput,
  ): Promise<WorkLedgerCompletenessResult> {
    const take = Math.min(
      input.limit ?? DEFAULT_COMPLETENESS_LIMIT,
      MAX_COMPLETENESS_LIMIT,
    );
    const rows: PlanCompletenessRow[] = await this.workLedgerService
      .getArtifactRepository()
      .manager.query(PLAN_COMPLETENESS_SQL);

    const owed: WorkLedgerPlanCompletenessObject[] = rows.filter(
      (row) => !row.recorded,
    );

    return {
      // The SQL orders unrecorded first, so the truncated list is the owed head, not a sample.
      owed: owed.slice(0, take),
      owedCount: owed.length,
      recordedCount: rows.length - owed.length,
      totalCount: rows.length,
    };
  }

  /**
   * Copy every subject of `fromSessionId` onto `toSessionId`, skipping any already there.
   * Additive and conflict-tolerant, mirroring attachWorkSessionSubject — the session is never
   * mutated, and re-running attaches nothing new.
   */
  private async mirrorSubjects(
    fromSessionId: string,
    toSessionId: string,
  ): Promise<void> {
    const repo = this.workLedgerService.getSubjectRepository();
    const [source, target] = await Promise.all([
      repo.find({ where: { sessionId: fromSessionId } }),
      repo.find({ where: { sessionId: toSessionId } }),
    ]);

    const present = new Set(
      target.map((subject) => `${subject.planId}:${subject.taskId ?? ''}`),
    );
    const missing = source.filter(
      (subject) => !present.has(`${subject.planId}:${subject.taskId ?? ''}`),
    );

    if (missing.length === 0) return;

    await repo.save(
      missing.map((subject) =>
        repo.create({
          planId: subject.planId,
          sessionId: toSessionId,
          taskId: subject.taskId,
        }),
      ),
    );
  }

  @Query(() => WorkArtifactListResult)
  async unverifiedWorkArtifacts(
    @Args('input') input: UnverifiedWorkArtifactsInput,
  ): Promise<{ artifacts: WorkArtifact[]; totalCount: number }> {
    const take = Math.min(
      input.limit ?? DEFAULT_UNVERIFIED_LIMIT,
      MAX_UNVERIFIED_LIMIT,
    );
    const artifacts = await this.workLedgerService
      .getArtifactRepository()
      .find({
        order: { producedAt: 'ASC' },
        take,
        where: {
          verification: 'unverified',
          ...(input.type != null ? { type: input.type } : {}),
        },
      });

    return { artifacts, totalCount: artifacts.length };
  }
}
