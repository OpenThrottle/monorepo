/**
 * @description Server-side work-ledger capture for first-party mutations (design §4.3, G11/G12/G13).
 * Records a born-verified `status_change` artifact for a task/plan status transition, inside the
 * SAME transaction as the row update (the caller passes its transactional EntityManager). Attributes
 * it to an ambient work session when a valid X-OT-Session-Id was presented (validated against the
 * request principal), otherwise opens an instant session. Downstream reactions stay OUTSIDE the
 * transaction — this service only writes the fact (session + subject + artifact).
 *
 * @see docs/monorepo/work-ledger-sessions.md for what a session means and why instant
 * sessions exist as their own closed_by value.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import {
  GlobalClsService,
  UNKNOWN_APP_NAME,
} from '@openthrottle/nestjs-modules';
import {
  WORK_ARTIFACT_SOURCE,
  WORK_ARTIFACT_VERIFICATION,
  WORK_SESSION_CLOSED_BY,
  WorkArtifact,
  WorkSession,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';
import { EntityManager, IsNull } from 'typeorm';

import { resolveArtifactForWrite } from './artifact-type-registry.ts';

/**
 * Recorded as the tool_name of an instant session when the request carried no usable
 * `x-app-name`. Deliberately not a guess: an honest "unknown" is worth more to a reviewer
 * than a plausible-looking client that did not actually make the call.
 */
const UNKNOWN_INSTANT_SESSION_TOOL_NAME = 'unknown';

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
  /**
   * Reuse an already-resolved session id instead of resolving ambient-or-instant again — set by a
   * bulk writer ({@link applyBulkTaskStatusChange}) that resolves the session ONCE via
   * {@link WorkLedgerCaptureService.resolveSessionId} for the (identical) actor shared by every row
   * in one bulk call, so one reset of N tasks does not mint N instant work sessions. Single-row
   * callers omit this and get the usual ambient-or-instant resolution.
   */
  readonly sessionId?: string | undefined;
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
   * manager. Resolves an ambient-or-instant session (or reuses `params.sessionId` when supplied),
   * ensures the subject, and appends a born-verified status_change artifact. Throws only on an
   * unresolved principal (rolls back with the row update).
   */
  async recordStatusChange(
    manager: EntityManager,
    params: RecordStatusChangeParams,
  ): Promise<void> {
    const actor = resolveActorColumns(params.actorSub, params.actorKind);
    const now = new Date();
    const sessionId =
      params.sessionId ?? (await this.resolveSession(manager, actor, now)).id;

    await this.ensureSubject(manager, sessionId, params.planId, params.taskId);

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
        sessionId,
        source: WORK_ARTIFACT_SOURCE.SERVER,
        type: 'status_change',
        // First-party, server-witnessed event: born verified, not a claim (design §3.3).
        verification: WORK_ARTIFACT_VERIFICATION.VERIFIED,
        verifiedAt: now,
      }),
    );
  }

  /**
   * @description Resolves (or opens) the session {@link recordStatusChange} would use for `actor`,
   * without writing any artifact — so a bulk writer can resolve it ONCE and pass the same id to
   * every row's `recordStatusChange` call via `params.sessionId`, instead of each row
   * independently resolving (and, absent an ambient session, each opening its OWN instant one).
   * Throws on an unresolved principal, same as `recordStatusChange`.
   */
  async resolveSessionId(
    manager: EntityManager,
    params: {
      readonly actorKind: string | undefined;
      readonly actorSub: string | undefined;
    },
  ): Promise<string> {
    const actor = resolveActorColumns(params.actorSub, params.actorKind);
    const session = await this.resolveSession(manager, actor, new Date());
    return session.id;
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
        closedBy: WORK_SESSION_CLOSED_BY.INSTANT,
        endedAt: now,
        onBehalfOfVerified: false,
        startedAt: now,
        toolName: this.resolveInstantSessionToolName(),
      }),
    );
  }

  /**
   * @description The client to record on an instant session, taken from the request's
   * `x-app-name` (seeded into CLS as `app.name`). This used to be hardcoded to
   * 'developer-app', which misattributed every instant session an MCP agent caused to the
   * developer app — and tool_name is exactly what `get_work_sessions` reports as attribution.
   */
  private resolveInstantSessionToolName(): string {
    const appName = this.globalCls.get('app')?.name;

    if (appName == null || appName === '' || appName === UNKNOWN_APP_NAME) {
      return UNKNOWN_INSTANT_SESSION_TOOL_NAME;
    }

    return appName;
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
