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
import {
  WORK_ARTIFACT_SOURCE,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import type {
  WorkArtifact,
  WorkSession,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';
import { In, IsNull } from 'typeorm';
import {
  ARTIFACT_IDENTITY,
  resolveArtifactForWrite,
} from './artifact-type-registry';
import {
  AttachWorkSessionSubjectInput,
  EndWorkSessionInput,
  RecordWorkArtifactInput,
  StartWorkSessionInput,
  UnverifiedWorkArtifactsInput,
  WorkArtifactsBySessionInput,
  WorkSessionsByPlanInput,
} from './work-ledger.input';
import {
  WorkArtifactListResult,
  WorkArtifactObject,
  WorkSessionListResult,
  WorkSessionObject,
  WorkSessionSubjectObject,
} from './work-ledger.object';

const DEFAULT_UNVERIFIED_LIMIT = 100;
const MAX_UNVERIFIED_LIMIT = 500;

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
      const existing = await repo.findOne({
        where: {
          externalKey: resolved.externalKey,
          sessionId: input.sessionId,
          type: input.type,
        },
      });

      if (existing) {
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
