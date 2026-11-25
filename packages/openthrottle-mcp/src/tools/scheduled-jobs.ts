/**
 * @description Scheduled-job tool handlers + schemas: create_scheduled_job, list_scheduled_jobs,
 * update_scheduled_job, delete_scheduled_job, run_scheduled_job_now. GraphQL-only: each delegates to
 * an `…AsAgent` operation of openthrottle-server, which is where the guardrails live (owner = the
 * caller, created_via = mcp, per-owner caps, idempotency, optional human approval). Nothing here can
 * create, reveal or rotate a webhook trigger. Served in the opt-in `scheduling` toolset.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import type {
  ScheduledJobFragment,
  ScheduledJobRunFragment,
} from '../__generated__/graphql.js';
import {
  CreateScheduledJobDocument,
  DeleteScheduledJobDocument,
  ListScheduledJobsDocument,
  RunScheduledJobNowDocument,
  UpdateScheduledJobDocument,
} from '../__generated__/graphql.js';
import {
  CreateScheduledAgentJobAsAgentInputTypeSchema,
  UpdateScheduledAgentJobAsAgentInputTypeSchema,
} from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/getAuthToken.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/runTool.ts';

/**
 * @description The guardrails every scheduling tool shares, stated once so each description carries
 * them in the same words.
 */
const GUARDRAILS = `Acts as the calling user (a service-account token acts as its linked acting user; an unlinked one is refused); repositoryCheckoutId must be one of the user's own checkouts. Limits: at most 25 jobs per user (SCHEDULED_AGENT_JOBS_MAX_PER_OWNER) and at most 10 created through these tools. If the operator requires approval, a created job is stored disabled with approvalState "pending" until a person approves it in the Developer UI; it cannot be enabled or run-now'd before that. allowedCommands (claude and grok only) lists shell command patterns the headless run may execute without a permission prompt, in Claude Code Bash(<pattern>) syntax without the wrapper (e.g. "pnpm run social:x-post *"); a job with a non-empty list is always stored pending for human approval, whatever the operator setting.`;

const describeJob = (job: ScheduledJobFragment): string => {
  const isCron = job.scheduleKind === 'cron';
  const when = isCron ? `cron "${job.cronPattern ?? ''}"` : job.scheduleKind;
  const state = job.enabled ? 'enabled' : 'disabled';

  const commands = job.allowedCommands.length;
  const allowlist = commands === 0 ? '' : `, ${commands} allowed command(s)`;

  return `${job.id} "${job.name}" [${when}, ${state}, ${job.createdVia}, approval ${job.approvalState}${allowlist}]`;
};

// ── create_scheduled_job ─────────────────────────────────────────────────────

export const createScheduledJobToolParameters =
  CreateScheduledAgentJobAsAgentInputTypeSchema().strict();

export const createScheduledJobToolDescription = `Schedule an agent run: a prompt for a driver (driverId, optional model) in one of the user's repository checkouts, on a schedule: scheduleKind cron (cronPattern, 5 or 6 fields, not every minute; optional timezone), interval (intervalMs >= 60000) or once (runAt, ISO 8601 with offset, in the future). idempotencyKey is required (1-200 characters): retrying with the same key returns the job the first call made, so reuse it on retry and use a new one for a different job. ${GUARDRAILS} Only jobs created through these tools can later be updated or deleted by them.`;

export async function createScheduledJobToolHandler(
  args: z.infer<typeof createScheduledJobToolParameters>,
): Promise<GenericResult<{ job: ScheduledJobFragment }>> {
  const parsed = createScheduledJobToolParameters.safeParse(args);
  if (!parsed.success) return invalidArgsContent(parsed.error);

  return runTool<{ job: ScheduledJobFragment }>(
    'create_scheduled_job',
    async () => {
      const result = await executeGraphqlWithAuth(
        getAuthToken(),
        CreateScheduledJobDocument,
        { input: parsed.data },
      );

      const job = result?.createScheduledAgentJobAsAgent ?? null;
      if (!job) return null;

      const isPending = job.approvalState === 'pending';
      const pending = isPending
        ? ' It is disabled until a person approves it in the Developer UI.'
        : '';
      const text = `Scheduled ${describeJob(job)}.${pending}`;
      return { structuredContent: { job }, text };
    },
  );
}

// ── list_scheduled_jobs ──────────────────────────────────────────────────────

export const listScheduledJobsToolParameters = z.object({}).strict();

export const listScheduledJobsToolDescription = `List the signed-in user's own scheduled agent jobs, newest first, whoever created them. createdVia "mcp" jobs can be updated or deleted by these tools; "ui" jobs can only be listed and run. approvalState "pending" means a person must approve it before it arms. No arguments. Needs a signed-in user token.`;

export async function listScheduledJobsToolHandler(
  _args: z.infer<typeof listScheduledJobsToolParameters>,
): Promise<GenericResult<{ jobs: ScheduledJobFragment[] }>> {
  return runTool<{ jobs: ScheduledJobFragment[] }>(
    'list_scheduled_jobs',
    async () => {
      const result = await executeGraphqlWithAuth(
        getAuthToken(),
        ListScheduledJobsDocument,
        {},
      );

      const jobs = result?.scheduledAgentJobsAsAgent ?? null;
      if (!jobs) return null;

      const lines = jobs.map(describeJob).join('\n');
      const isEmpty = jobs.length === 0;
      const text = isEmpty
        ? 'No scheduled jobs.'
        : `${jobs.length} scheduled job(s):\n${lines}`;
      return { structuredContent: { jobs }, text };
    },
  );
}

// ── update_scheduled_job ─────────────────────────────────────────────────────

export const updateScheduledJobToolParameters =
  UpdateScheduledAgentJobAsAgentInputTypeSchema().strict();

export const updateScheduledJobToolDescription = `Change a scheduled job by id; send only the fields to change (schedule fields follow create_scheduled_job). Works only on jobs created through these tools (createdVia "mcp") and owned by the user: a job a person made in the UI is refused. enabled pauses or resumes it, but cannot enable a job with approvalState "pending"; if the operator requires approval, or the job has allowedCommands, changing an approved job's content sends it back to pending and disables it. allowedCommands replaces the whole list; [] clears it. ${GUARDRAILS}`;

export async function updateScheduledJobToolHandler(
  args: z.infer<typeof updateScheduledJobToolParameters>,
): Promise<GenericResult<{ job: ScheduledJobFragment }>> {
  const parsed = updateScheduledJobToolParameters.safeParse(args);
  if (!parsed.success) return invalidArgsContent(parsed.error);

  return runTool<{ job: ScheduledJobFragment }>(
    'update_scheduled_job',
    async () => {
      const result = await executeGraphqlWithAuth(
        getAuthToken(),
        UpdateScheduledJobDocument,
        { input: parsed.data },
      );

      const job = result?.updateScheduledAgentJobAsAgent ?? null;
      if (!job) return null;

      return {
        structuredContent: { job },
        text: `Updated ${describeJob(job)}.`,
      };
    },
  );
}

// ── delete_scheduled_job ─────────────────────────────────────────────────────

export const deleteScheduledJobToolParameters = z
  .object({ id: z.string().min(1) })
  .strict();

export const deleteScheduledJobToolDescription = `Delete a scheduled job by id. Works only on jobs created through these tools (createdVia "mcp") and owned by the user; a job a person made in the UI is refused. Its run history is kept. Needs a signed-in user token.`;

export async function deleteScheduledJobToolHandler(
  args: z.infer<typeof deleteScheduledJobToolParameters>,
): Promise<GenericResult<{ deleted: boolean; id: string }>> {
  const parsed = deleteScheduledJobToolParameters.safeParse(args);
  if (!parsed.success) return invalidArgsContent(parsed.error);

  return runTool<{ deleted: boolean; id: string }>(
    'delete_scheduled_job',
    async () => {
      const result = await executeGraphqlWithAuth(
        getAuthToken(),
        DeleteScheduledJobDocument,
        { id: parsed.data.id },
      );

      const deleted = result?.deleteScheduledAgentJobAsAgent ?? null;
      if (deleted === null) return null;

      const text = deleted
        ? `Deleted scheduled job ${parsed.data.id}.`
        : `Scheduled job ${parsed.data.id} was already gone.`;
      return { structuredContent: { deleted, id: parsed.data.id }, text };
    },
  );
}

// ── run_scheduled_job_now ────────────────────────────────────────────────────

export const runScheduledJobNowToolParameters = z
  .object({ id: z.string().min(1) })
  .strict();

export const runScheduledJobNowToolDescription = `Start one run of a scheduled job now, even if it is disabled. Works on any job the user owns, including ones a person made in the UI, but not on a job with approvalState "pending". Returns the queued run; it does not wait for it to finish. Needs a signed-in user token.`;

export async function runScheduledJobNowToolHandler(
  args: z.infer<typeof runScheduledJobNowToolParameters>,
): Promise<GenericResult<{ run: ScheduledJobRunFragment }>> {
  const parsed = runScheduledJobNowToolParameters.safeParse(args);
  if (!parsed.success) return invalidArgsContent(parsed.error);

  return runTool<{ run: ScheduledJobRunFragment }>(
    'run_scheduled_job_now',
    async () => {
      const result = await executeGraphqlWithAuth(
        getAuthToken(),
        RunScheduledJobNowDocument,
        { id: parsed.data.id },
      );

      const run = result?.runScheduledAgentJobNowAsAgent ?? null;
      if (!run) return null;

      return {
        structuredContent: { run },
        text: `Queued run ${run.id} of scheduled job ${run.scheduledAgentJobId} (${run.status}).`,
      };
    },
  );
}
