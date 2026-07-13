/**
 * @description In-process work-ledger capture for the Ralph plan worker (design §4.1, G5).
 * The plans worker is server-side code, so it opens/closes its run session directly via the
 * repositories (no GraphQL round-trip to itself). The session's actor is the workflow-ralph
 * service account; on_behalf_of is inherited VERIFIED from plan_runs.actor_user_id (which was
 * stamped from an authenticated principal at enqueue time).
 *
 * Every method is best-effort and NEVER throws: ledger bookkeeping must not break a plan run.
 * git_commit / pull_request artifacts are NOT captured here — no commit SHA surfaces to the
 * in-process orchestrator; the agent self-reports them via MCP (slice 5) and the git verifier
 * reconciles them (slice 6).
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanRunsService,
  ServiceAccountsService,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';

/** Seeded service account that owns Ralph runs (databases/migrations/045). */
const WORKFLOW_RALPH_SERVICE_ACCOUNT_NAME = 'workflow-ralph';
const TOOL_NAME = 'workflow-ralph';

export interface OpenRalphSessionInput {
  readonly bullmqJobId: string;
  readonly model?: string | null;
  readonly planId: string;
  readonly queueName: string;
}

@Injectable()
export class WorkLedgerRunService {
  constructor(
    private readonly logger: LoggerService,
    private readonly planRunsService: PlanRunsService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly workLedgerService: WorkLedgerService,
  ) {}

  /**
   * @description Opens a work session for a Ralph run and attaches the plan subject. Returns the
   * session id, or null when prerequisites are missing / anything fails (best-effort). The caller
   * passes the returned id to {@link closeRalphSession} in its finally block.
   */
  async openRalphSession(input: OpenRalphSessionInput): Promise<string | null> {
    try {
      const planRun = await this.planRunsService.findByQueueNameAndBullmqJobId(
        input.queueName,
        input.bullmqJobId,
      );
      const ralphAccount = await this.serviceAccountsService.findByName(
        WORKFLOW_RALPH_SERVICE_ACCOUNT_NAME,
      );

      if (!ralphAccount) {
        this.logger.warn(
          `Work-ledger: no '${WORKFLOW_RALPH_SERVICE_ACCOUNT_NAME}' service account; skipping run session for plan ${input.planId}.`,
          WorkLedgerRunService.name,
        );
        return null;
      }

      const onBehalfOfUserId = planRun?.actorUserId ?? null;
      const sessionRepo = this.workLedgerService.getSessionRepository();
      const session = await sessionRepo.save(
        sessionRepo.create({
          actorServiceAccountId: ralphAccount.id,
          actorUserId: null,
          externalRef: input.bullmqJobId,
          model: input.model ?? null,
          onBehalfOfUserId,
          // Verified: the human came from plan_runs.actor_user_id, stamped from an
          // authenticated principal at enqueue (design §2.3, G5).
          onBehalfOfVerified: onBehalfOfUserId != null,
          planRunId: planRun?.id ?? null,
          toolName: TOOL_NAME,
        }),
      );

      const subjectRepo = this.workLedgerService.getSubjectRepository();
      await subjectRepo.save(
        subjectRepo.create({
          planId: input.planId,
          sessionId: session.id,
          taskId: null,
        }),
      );

      return session.id;
    } catch (error) {
      this.logger.warn(
        `Work-ledger: failed to open run session for plan ${input.planId}: ${String(error)}`,
        WorkLedgerRunService.name,
      );
      return null;
    }
  }

  /**
   * @description Closes a run session (idempotent: only stamps a still-open session). Best-effort.
   */
  async closeRalphSession(
    sessionId: string | null,
    summary: string | null,
  ): Promise<void> {
    if (sessionId == null) return;

    try {
      const sessionRepo = this.workLedgerService.getSessionRepository();
      const session = await sessionRepo.findOne({ where: { id: sessionId } });

      if (!session) return;

      if (session.endedAt == null) {
        session.endedAt = new Date();
        session.closedBy = 'explicit';
      }

      if (summary != null) session.summary = summary;

      await sessionRepo.save(session);
    } catch (error) {
      this.logger.warn(
        `Work-ledger: failed to close run session ${sessionId}: ${String(error)}`,
        WorkLedgerRunService.name,
      );
    }
  }
}
