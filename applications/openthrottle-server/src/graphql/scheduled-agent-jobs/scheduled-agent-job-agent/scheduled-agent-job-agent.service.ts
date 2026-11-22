/**
 * @description Guardrails for jobs scheduled by an agent over MCP (threat model T10 in
 * docs/openthrottle/webhook-triggered-agent-jobs.md). Wraps the shared schedule service and adds:
 * owner = caller, `created_via = 'mcp'` stamped here (never client-supplied), idempotent create,
 * the caps (the shared service enforces them), optional human approval before a created job arms,
 * and edit/delete limited to jobs this path created. It has no access to webhook triggers.
 */
import { Injectable } from '@nestjs/common';
import type {
  ScheduledAgentJob,
  ScheduledAgentJobRun,
} from '@openthrottle/nestjs-repositories-server';
import { ScheduledAgentJobsRepository } from '@openthrottle/nestjs-repositories-server';

import { isUniqueViolation } from '../../../services/plan-creation/plan-creation.utils.ts';
import { SCHEDULED_AGENT_JOB_LIMIT_CODES } from '../scheduled-agent-jobs.constants.ts';
import { ScheduledAgentJobsGraphqlService } from '../scheduled-agent-jobs.service.ts';
import {
  createScheduledAgentJobGuardrailError,
  resolveScheduledAgentJobLimits,
} from '../scheduled-agent-jobs.utils.ts';
import type {
  CreateScheduledAgentJobAsAgentInputType,
  UpdateScheduledAgentJobAsAgentInputType,
} from './scheduled-agent-job-agent.input.ts';
import {
  assertAgentManagedJob,
  assertOwnedJob,
  normalizeIdempotencyKey,
} from './scheduled-agent-job-agent.utils.ts';

@Injectable()
export class ScheduledAgentJobAgentService {
  constructor(
    private readonly jobs: ScheduledAgentJobsGraphqlService,
    private readonly jobsRepository: ScheduledAgentJobsRepository,
  ) {}

  /** @description The caller's own jobs (any creator), newest first. */
  list(ownerUserId: string): Promise<ScheduledAgentJob[]> {
    return this.jobs.list(ownerUserId);
  }

  /**
   * @description Creates an agent job, or returns the one an earlier call with the same
   * `(owner, idempotencyKey)` made (the retry's other fields are not compared). Under
   * `SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL=true` the job is stored disabled and `pending`.
   */
  async create(
    ownerUserId: string,
    input: CreateScheduledAgentJobAsAgentInputType,
  ): Promise<ScheduledAgentJob> {
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const existing = await this.jobsRepository.findJobByIdempotencyKey(
      ownerUserId,
      idempotencyKey,
    );
    if (existing !== null) {
      return existing;
    }

    const { mcpRequireApproval } = resolveScheduledAgentJobLimits(process.env);
    try {
      return await this.jobs.create({
        ...input,
        approvalState: mcpRequireApproval ? 'pending' : 'not_required',
        createdVia: 'mcp',
        enabled: mcpRequireApproval ? false : input.enabled,
        idempotencyKey,
        ownerUserId,
      });
    } catch (error) {
      // Two simultaneous creates with one key: the unique index let one through.
      if (isUniqueViolation(error)) {
        const winner = await this.jobsRepository.findJobByIdempotencyKey(
          ownerUserId,
          idempotencyKey,
        );
        if (winner !== null) {
          return winner;
        }
      }
      throw error;
    }
  }

  /**
   * @description Updates an agent-created job the caller owns. With approval required, changing an
   * approved job's content sends it back to `pending` and disables it, so an approved schedule
   * cannot be rewritten into something nobody approved.
   */
  async update(
    ownerUserId: string,
    input: UpdateScheduledAgentJobAsAgentInputType,
  ): Promise<ScheduledAgentJob> {
    const { enabled, id, ...content } = input;
    const existing = assertAgentManagedJob(
      await this.jobs.get(id),
      id,
      ownerUserId,
    );

    const changesContent = Object.values(content).some((value) => {
      return value !== undefined;
    });
    const { mcpRequireApproval } = resolveScheduledAgentJobLimits(process.env);
    const needsReapproval =
      mcpRequireApproval &&
      existing.approvalState === 'approved' &&
      changesContent;
    const nextApprovalState = needsReapproval ? 'pending' : undefined;
    const nextEnabled = needsReapproval ? false : enabled;

    return this.jobs.update(id, {
      ...content,
      approvalState: nextApprovalState,
      enabled: nextEnabled,
    });
  }

  /** @description Deletes an agent-created job the caller owns. */
  async delete(ownerUserId: string, id: string): Promise<boolean> {
    assertAgentManagedJob(await this.jobs.get(id), id, ownerUserId);
    return this.jobs.delete(id);
  }

  /**
   * @description Runs one of the caller's jobs now, whoever created it. A job still awaiting human
   * approval cannot be run: run-now would otherwise sidestep the approval it is waiting for.
   */
  async runNow(ownerUserId: string, id: string): Promise<ScheduledAgentJobRun> {
    const job = assertOwnedJob(await this.jobs.get(id), id, ownerUserId);
    if (job.approvalState === 'pending') {
      throw createScheduledAgentJobGuardrailError(
        SCHEDULED_AGENT_JOB_LIMIT_CODES.APPROVAL_PENDING,
        `Scheduled job ${id} is awaiting human approval and cannot be run yet.`,
      );
    }

    return this.jobs.runNow(id);
  }
}
