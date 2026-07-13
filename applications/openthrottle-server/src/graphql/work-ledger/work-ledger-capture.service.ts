/**
 * @description Server-side work-ledger capture for first-party mutations (design §4.3, G11/G12/G13).
 * Records a born-verified `status_change` artifact for a task/plan status transition, inside the
 * SAME transaction as the row update (the caller passes its transactional EntityManager). Attributes
 * it to an ambient work session when a valid X-OT-Session-Id was presented (validated against the
 * request principal), otherwise opens an instant session. Downstream reactions stay OUTSIDE the
 * transaction — this service only writes the fact (session + subject + artifact).
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import {
  WORK_ARTIFACT_SOURCE,
  WORK_ARTIFACT_VERIFICATION,
  WORK_SESSION_CLOSED_BY,
  WorkArtifact,
  WorkSession,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';
import { EntityManager, IsNull } from 'typeorm';
import { resolveArtifactForWrite } from './artifact-type-registry';

const INSTANT_SESSION_TOOL_NAME = 'developer-app';

interface ActorColumns {
  actorServiceAccountId: string | null;
  actorUserId: string | null;
}

export interface RecordStatusChangeParams {
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
  readonly entity: 'plan' | 'task';
  readonly from: string | null;
  readonly id: string;
  readonly planId: string;
  readonly taskId: string | null;
  readonly to: string;
}

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
    'Cannot record work-ledger status change: unresolved authentication principal.',
  );
}

/** True when the session's actor matches the request principal (G11 ambient-attribution guard). */
function sessionBelongsToActor(
  session: WorkSession,
  actor: ActorColumns,
): boolean {
  if (actor.actorUserId != null) {
    return session.actorUserId === actor.actorUserId;
  }

  return session.actorServiceAccountId === actor.actorServiceAccountId;
}

@Injectable()
export class WorkLedgerCaptureService {
  constructor(private readonly globalCls: GlobalClsService) {}

  /**
   * @description Write the ledger fact for a status transition using the caller's transactional
   * manager. Resolves an ambient-or-instant session, ensures the subject, and appends a born-verified
   * status_change artifact. Throws only on an unresolved principal (rolls back with the row update).
   */
  async recordStatusChange(
    manager: EntityManager,
    params: RecordStatusChangeParams,
  ): Promise<void> {
    const actor = resolveActorColumns(params.actorSub, params.actorKind);
    const now = new Date();
    const session = await this.resolveSession(manager, actor, now);

    await this.ensureSubject(manager, session.id, params.planId, params.taskId);

    const resolved = resolveArtifactForWrite('status_change', {
      entity: params.entity,
      from: params.from,
      id: params.id,
      to: params.to,
    });
    const artifactRepo = manager.getRepository(WorkArtifact);

    await artifactRepo.save(
      artifactRepo.create({
        externalKey: resolved.externalKey,
        lifecycle: null,
        message: null,
        payload: resolved.payload,
        producedAt: now,
        sessionId: session.id,
        source: WORK_ARTIFACT_SOURCE.SERVER,
        type: 'status_change',
        // First-party, server-witnessed event: born verified, not a claim (design §3.3).
        verification: WORK_ARTIFACT_VERIFICATION.VERIFIED,
        verifiedAt: now,
      }),
    );
  }

  /**
   * @description Use the ambient session from X-OT-Session-Id when it exists AND belongs to the
   * request principal; otherwise open an instant session. Never errors on a bad/foreign id (G11).
   */
  private async resolveSession(
    manager: EntityManager,
    actor: ActorColumns,
    now: Date,
  ): Promise<WorkSession> {
    const sessionRepo = manager.getRepository(WorkSession);
    const ambientSessionId = this.globalCls.get('sessionId');

    if (ambientSessionId != null && ambientSessionId !== '') {
      const ambient = await sessionRepo.findOne({
        where: { id: ambientSessionId },
      });

      if (ambient && sessionBelongsToActor(ambient, actor)) {
        return ambient;
      }
    }

    return sessionRepo.save(
      sessionRepo.create({
        actorServiceAccountId: actor.actorServiceAccountId,
        actorUserId: actor.actorUserId,
        closedBy: WORK_SESSION_CLOSED_BY.EXPLICIT,
        endedAt: now,
        onBehalfOfVerified: false,
        startedAt: now,
        toolName: INSTANT_SESSION_TOOL_NAME,
      }),
    );
  }

  /** Idempotently ensure a (session, plan, task) subject row (mirrors the sentinel unique index). */
  private async ensureSubject(
    manager: EntityManager,
    sessionId: string,
    planId: string,
    taskId: string | null,
  ): Promise<void> {
    const subjectRepo = manager.getRepository(WorkSessionSubject);
    const existing = await subjectRepo.findOne({
      where: {
        planId,
        sessionId,
        taskId: taskId == null ? IsNull() : taskId,
      },
    });

    if (existing) return;

    await subjectRepo.save(subjectRepo.create({ planId, sessionId, taskId }));
  }
}
