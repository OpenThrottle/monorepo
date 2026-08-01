/**
 * @description Orchestration + validation for the scheduled-agent-jobs GraphQL surface. Validates
 * cron/driver/capability/settings, then coordinates the repositories service (persistence), the
 * scheduler service (BullMQ projection), and the shared queue (run-now enqueue). The DB write and the
 * scheduler upsert are ordered write-then-project (mirroring enqueue-after-commit): a scheduler is
 * only registered after its row exists.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getDriver,
  parseDriverId,
  UnknownDriverError,
} from '@openthrottle/openthrottle-drivers';
import {
  ScheduledAgentJobsService,
  type ScheduledAgentJob,
  type ScheduledAgentJobDriverId,
  type ScheduledAgentJobRun,
  type ScheduledAgentJobSettings,
} from '@openthrottle/nestjs-repositories';
import { ScheduledAgentJobCancellationService } from '../../queues/scheduled-agent-jobs/scheduled-agent-job-cancellation.service';
import { ScheduledAgentJobSchedulerService } from '../../queues/scheduled-agent-jobs/scheduled-agent-job-scheduler.service';
import {
  SCHEDULED_AGENT_JOB_NAME,
  SCHEDULED_AGENT_JOB_OPTIONS,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from '../../queues/scheduled-agent-jobs/scheduled-agent-jobs.constants';
import type { ScheduledAgentJobPayload } from '../../queues/scheduled-agent-jobs/scheduled-agent-jobs.types';
import { validateScheduledAgentJobCron } from './scheduled-agent-jobs.cron';

/** Shape a create request arrives in (settings already validated/parsed). */
interface CreateArgs {
  readonly cronPattern: string;
  readonly cwd?: string | null;
  readonly driverId: string;
  readonly enabled?: boolean;
  readonly model?: string | null;
  readonly name: string;
  readonly ownerUserId: string | null;
  readonly prompt: string;
  readonly settingsJson?: string | null;
  readonly timeoutMs?: number | null;
  readonly timezone?: string | null;
}

interface UpdateArgs {
  readonly cronPattern?: string;
  readonly cwd?: string | null;
  readonly driverId?: string;
  readonly model?: string | null;
  readonly name?: string;
  readonly settingsJson?: string | null;
  readonly timeoutMs?: number | null;
  readonly timezone?: string | null;
}

@Injectable()
export class ScheduledAgentJobsGraphqlService {
  constructor(
    private readonly logger: LoggerService,
    private readonly jobsService: ScheduledAgentJobsService,
    private readonly scheduler: ScheduledAgentJobSchedulerService,
    private readonly cancellation: ScheduledAgentJobCancellationService,
    @InjectQueue(SCHEDULED_AGENT_JOBS_QUEUE_NAME)
    private readonly queue: Queue<ScheduledAgentJobPayload, void>,
  ) {}

  list(ownerUserId?: string): Promise<ScheduledAgentJob[]> {
    return this.jobsService.listJobs(ownerUserId);
  }

  get(id: string): Promise<ScheduledAgentJob | null> {
    return this.jobsService.findJobById(id);
  }

  listRuns(
    scheduledAgentJobId: string,
    limit?: number,
  ): Promise<ScheduledAgentJobRun[]> {
    return this.jobsService.listRunsForJob(scheduledAgentJobId, limit);
  }

  getRun(runId: string): Promise<ScheduledAgentJobRun | null> {
    return this.jobsService.findRunById(runId);
  }

  async create(args: CreateArgs): Promise<ScheduledAgentJob> {
    const driverId = this.validateDriver(args.driverId, {
      model: args.model,
      settingsJson: args.settingsJson,
    });
    this.assertValidCron(args.cronPattern);
    const settings = this.parseSettings(args.settingsJson);

    const job = await this.jobsService.createJob({
      cronPattern: args.cronPattern,
      cwd: args.cwd ?? null,
      driverId,
      enabled: args.enabled ?? true,
      model: args.model ?? null,
      name: args.name,
      ownerUserId: args.ownerUserId,
      prompt: args.prompt,
      settings,
      timeoutMs: args.timeoutMs ?? null,
      timezone: args.timezone ?? null,
    });

    await this.projectScheduler(job);
    return this.reload(job.id);
  }

  async update(id: string, args: UpdateArgs): Promise<ScheduledAgentJob> {
    const existing = await this.requireJob(id);

    const driverId = this.validateDriver(args.driverId ?? existing.driverId, {
      existingSettings: existing.settings,
      model: args.model === undefined ? existing.model : args.model,
      settingsJson: args.settingsJson,
    });
    if (args.cronPattern !== undefined) {
      this.assertValidCron(args.cronPattern);
    }

    const updated = await this.jobsService.updateJob(id, {
      cronPattern: args.cronPattern,
      cwd: args.cwd,
      driverId: args.driverId === undefined ? undefined : driverId,
      model: args.model,
      name: args.name,
      settings:
        args.settingsJson === undefined
          ? undefined
          : this.parseSettings(args.settingsJson),
      timeoutMs: args.timeoutMs,
      timezone: args.timezone,
    });
    if (updated === null) {
      throw new BadRequestException(`Scheduled job ${id} not found`);
    }

    await this.projectScheduler(updated);
    return this.reload(id);
  }

  async setEnabled(id: string, enabled: boolean): Promise<ScheduledAgentJob> {
    const updated = await this.jobsService.setJobEnabled(id, enabled);
    if (updated === null) {
      throw new BadRequestException(`Scheduled job ${id} not found`);
    }

    await this.projectScheduler(updated);
    return this.reload(id);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.jobsService.findJobById(id);
    if (existing === null) {
      return false;
    }

    await this.scheduler.removeScheduler(existing.schedulerKey);
    return this.jobsService.deleteJob(id);
  }

  /**
   * @description Enqueue an immediate one-off run. Pre-creates the run row (trigger=manual) and sets
   * the BullMQ jobId to the run id so the JSONL log join is deterministic. Allowed on a disabled
   * schedule (useful to test before enabling).
   */
  async runNow(id: string): Promise<ScheduledAgentJobRun> {
    const job = await this.requireJob(id);

    const run = await this.jobsService.createRun({
      driverId: job.driverId,
      model: job.model,
      scheduledAgentJobId: job.id,
      status: 'queued',
      trigger: 'manual',
    });

    const payload: ScheduledAgentJobPayload = {
      cwd: job.cwd,
      driverId: job.driverId,
      model: job.model,
      prompt: job.prompt,
      runId: run.id,
      scheduleId: job.id,
      settings: job.settings,
      timeoutMs: job.timeoutMs,
    };

    await this.queue.add(SCHEDULED_AGENT_JOB_NAME, payload, {
      ...SCHEDULED_AGENT_JOB_OPTIONS,
      jobId: run.id,
    });

    return run;
  }

  /**
   * @description Request cancellation of an in-flight run: durable marker + best-effort in-process
   * abort. Cross-process cancellation (a pub/sub channel) is a follow-up; the marker is the guaranteed
   * fallback.
   */
  async cancelRun(runId: string): Promise<ScheduledAgentJobRun> {
    const run = await this.jobsService.findRunById(runId);
    if (run === null) {
      throw new BadRequestException(`Scheduled job run ${runId} not found`);
    }

    await this.jobsService.requestRunCancel(runId);
    this.cancellation.abort(runId);

    const refreshed = await this.jobsService.findRunById(runId);
    return refreshed ?? run;
  }

  private async projectScheduler(job: ScheduledAgentJob): Promise<void> {
    if (job.enabled) {
      const next = await this.scheduler.upsertScheduler(job);
      await this.jobsService.updateNextRunAt(job.id, next);
    } else {
      await this.scheduler.removeScheduler(job.schedulerKey);
      await this.jobsService.updateNextRunAt(job.id, null);
    }
  }

  private async requireJob(id: string): Promise<ScheduledAgentJob> {
    const job = await this.jobsService.findJobById(id);
    if (job === null) {
      throw new BadRequestException(`Scheduled job ${id} not found`);
    }
    return job;
  }

  private async reload(id: string): Promise<ScheduledAgentJob> {
    const job = await this.jobsService.findJobById(id);
    if (job === null) {
      throw new BadRequestException(`Scheduled job ${id} vanished after write`);
    }
    return job;
  }

  private assertValidCron(pattern: string): void {
    const result = validateScheduledAgentJobCron(pattern);
    if (!result.ok) {
      throw new BadRequestException(result.reason ?? 'Invalid cron pattern');
    }
  }

  /**
   * @description Validates the driver id and that the requested model/endpoint/worktree are supported
   * by that driver's capabilities. Returns the typed driver id. Throws BadRequestException on any
   * mismatch (never a silent drop).
   */
  private validateDriver(
    rawDriverId: string,
    opts: {
      readonly existingSettings?: ScheduledAgentJobSettings;
      readonly model?: string | null;
      readonly settingsJson?: string | null;
    },
  ): ScheduledAgentJobDriverId {
    let driverId: ScheduledAgentJobDriverId;
    try {
      driverId = parseDriverId(rawDriverId);
    } catch (error) {
      if (error instanceof UnknownDriverError) {
        throw new BadRequestException(`Unknown driver "${rawDriverId}"`);
      }
      throw error;
    }

    const driver = getDriver(driverId);
    const model = opts.model?.trim();
    if (model && !driver.capabilities.supportsModelFlag) {
      throw new BadRequestException(
        `Driver "${driverId}" does not support a model flag`,
      );
    }

    const settings =
      opts.settingsJson === undefined || opts.settingsJson === null
        ? opts.existingSettings
        : this.parseSettings(opts.settingsJson);
    if (settings?.endpoint && !driver.capabilities.supportsCustomBaseUrl) {
      throw new BadRequestException(
        `Driver "${driverId}" does not support a custom endpoint`,
      );
    }
    if (settings?.worktree && !driver.capabilities.worktree) {
      throw new BadRequestException(
        `Driver "${driverId}" does not support worktrees`,
      );
    }

    return driverId;
  }

  /**
   * @description Parses + validates the settings JSON into the strict AgentPromptSettings subset.
   * Rejects unknown top-level keys, unknown endpoint/worktree keys, and endpoint.apiKey (never persist
   * a plaintext key).
   */
  private parseSettings(
    settingsJson: string | null | undefined,
  ): ScheduledAgentJobSettings {
    if (
      settingsJson === undefined ||
      settingsJson === null ||
      settingsJson.trim() === ''
    ) {
      return {};
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(settingsJson);
    } catch {
      throw new BadRequestException('settingsJson is not valid JSON');
    }

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      throw new BadRequestException('settingsJson must be a JSON object');
    }

    const record: Record<string, unknown> = { ...parsed };
    const settings: {
      endpoint?: ScheduledAgentJobSettings['endpoint'];
      worktree?: ScheduledAgentJobSettings['worktree'];
    } = {};

    for (const key of Object.keys(record)) {
      if (key !== 'endpoint' && key !== 'worktree') {
        throw new BadRequestException(`Unknown settings key "${key}"`);
      }
    }

    if (record.endpoint !== undefined) {
      settings.endpoint = this.parseEndpoint(record.endpoint);
    }
    if (record.worktree !== undefined) {
      settings.worktree = this.parseWorktree(record.worktree);
    }

    return settings;
  }

  private parseEndpoint(
    raw: unknown,
  ): NonNullable<ScheduledAgentJobSettings['endpoint']> {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException('settings.endpoint must be an object');
    }
    const record: Record<string, unknown> = { ...raw };

    if ('apiKey' in record) {
      throw new BadRequestException(
        'settings.endpoint.apiKey is not allowed; configure keys via server env',
      );
    }
    for (const key of Object.keys(record)) {
      if (key !== 'baseUrl' && key !== 'provider' && key !== 'configFilePath') {
        throw new BadRequestException(`Unknown endpoint key "${key}"`);
      }
    }
    if (typeof record.baseUrl !== 'string' || record.baseUrl.trim() === '') {
      throw new BadRequestException('settings.endpoint.baseUrl is required');
    }

    return {
      baseUrl: record.baseUrl,
      ...(record.provider === 'lmstudio' ||
      record.provider === 'ollama' ||
      record.provider === null
        ? { provider: record.provider }
        : {}),
      ...(typeof record.configFilePath === 'string'
        ? { configFilePath: record.configFilePath }
        : {}),
    };
  }

  private parseWorktree(
    raw: unknown,
  ): NonNullable<ScheduledAgentJobSettings['worktree']> {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException('settings.worktree must be an object');
    }
    const record: Record<string, unknown> = { ...raw };
    for (const key of Object.keys(record)) {
      if (
        key !== 'skipWorktreeSetup' &&
        key !== 'worktree' &&
        key !== 'worktreeBase'
      ) {
        throw new BadRequestException(`Unknown worktree key "${key}"`);
      }
    }

    return {
      ...(typeof record.skipWorktreeSetup === 'boolean'
        ? { skipWorktreeSetup: record.skipWorktreeSetup }
        : {}),
      ...(typeof record.worktree === 'string'
        ? { worktree: record.worktree }
        : {}),
      ...(typeof record.worktreeBase === 'string'
        ? { worktreeBase: record.worktreeBase }
        : {}),
    };
  }
}
