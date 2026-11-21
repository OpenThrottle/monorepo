import { createMock } from '@golevelup/ts-vitest';
import { ForbiddenException } from '@nestjs/common';
import type {
  ScheduledAgentJob,
  ScheduledAgentJobRun,
  ScheduledAgentJobsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { ScheduledAgentJobsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { createScheduledAgentJobsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledAgentJobsGraphqlService } from '../scheduled-agent-jobs.service.ts';
import type { CreateScheduledAgentJobAsAgentInputType } from './scheduled-agent-job-agent.input.ts';
import { ScheduledAgentJobAgentService } from './scheduled-agent-job-agent.service.ts';

const jobFixture = (
  overrides: Partial<ScheduledAgentJob>,
): ScheduledAgentJob => {
  return createMock<ScheduledAgentJob>({
    approvalState: 'not_required',
    createdVia: 'mcp',
    id: 'j1',
    ownerUserId: 'user-1',
    ...overrides,
  });
};

const createInput: CreateScheduledAgentJobAsAgentInputType = {
  cronPattern: '0 9 * * *',
  driverId: 'claude',
  idempotencyKey: 'key-1',
  name: 'nightly',
  prompt: 'audit',
  repositoryCheckoutId: 'checkout-1',
};

describe('ScheduledAgentJobAgentService', () => {
  let jobsRepository: ScheduledAgentJobsRepositoryMock;
  let jobs: ScheduledAgentJobsGraphqlService;
  let service: ScheduledAgentJobAgentService;

  beforeEach(() => {
    jobsRepository = createScheduledAgentJobsRepositoryMock();
    jobs = createMock<ScheduledAgentJobsGraphqlService>({
      create: vi.fn().mockResolvedValue(jobFixture({})),
      delete: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(jobFixture({})),
      list: vi.fn().mockResolvedValue([]),
      runNow: vi
        .fn()
        .mockResolvedValue(createMock<ScheduledAgentJobRun>({ id: 'run-1' })),
      update: vi.fn().mockResolvedValue(jobFixture({})),
    });
    service = new ScheduledAgentJobAgentService(
      jobs,
      asMock<ScheduledAgentJobsRepository>(jobsRepository),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('create', () => {
    it('stamps created_via=mcp and the caller as owner', async () => {
      await service.create('user-1', createInput);

      expect(jobs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalState: 'not_required',
          createdVia: 'mcp',
          idempotencyKey: 'key-1',
          ownerUserId: 'user-1',
        }),
      );
    });

    it('returns the existing job for the same (owner, idempotencyKey) without creating', async () => {
      const existing = jobFixture({ id: 'earlier' });
      jobsRepository.findJobByIdempotencyKey.mockResolvedValue(existing);

      await expect(service.create('user-1', createInput)).resolves.toBe(
        existing,
      );
      expect(jobsRepository.findJobByIdempotencyKey).toHaveBeenCalledWith(
        'user-1',
        'key-1',
      );
      expect(jobs.create).not.toHaveBeenCalled();
    });

    it('returns the winner when a simultaneous create trips the unique index', async () => {
      const winner = jobFixture({ id: 'winner' });
      jobsRepository.findJobByIdempotencyKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner);
      vi.mocked(jobs.create).mockRejectedValue({ code: '23505' });

      await expect(service.create('user-1', createInput)).resolves.toBe(winner);
    });

    it('rethrows a cap rejection from the shared service', async () => {
      const limit = new Error('limit');
      vi.mocked(jobs.create).mockRejectedValue(limit);

      await expect(service.create('user-1', createInput)).rejects.toBe(limit);
    });

    it('rejects a blank idempotency key', async () => {
      await expect(
        service.create('user-1', { ...createInput, idempotencyKey: '  ' }),
      ).rejects.toThrow('idempotencyKey');
    });

    it('stores the job disabled and pending when approval is required, even if enabled was asked for', async () => {
      vi.stubEnv('SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL', 'true');

      await service.create('user-1', { ...createInput, enabled: true });

      expect(jobs.create).toHaveBeenCalledWith(
        expect.objectContaining({ approvalState: 'pending', enabled: false }),
      );
    });
  });

  describe('update', () => {
    it('refuses a job created through the UI', async () => {
      vi.mocked(jobs.get).mockResolvedValue(jobFixture({ createdVia: 'ui' }));

      await expect(
        service.update('user-1', { id: 'j1', name: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(jobs.update).not.toHaveBeenCalled();
    });

    it('refuses a job owned by someone else, as if it did not exist', async () => {
      vi.mocked(jobs.get).mockResolvedValue(
        jobFixture({ ownerUserId: 'user-2' }),
      );

      await expect(
        service.update('user-1', { id: 'j1', name: 'x' }),
      ).rejects.toThrow('not found');
    });

    it('updates an agent-created job the caller owns', async () => {
      await service.update('user-1', { id: 'j1', name: 'renamed' });

      expect(jobs.update).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({ name: 'renamed' }),
      );
    });

    it('passes enabled through; the shared service refuses it while pending', async () => {
      await service.update('user-1', { enabled: true, id: 'j1' });

      expect(jobs.update).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({ enabled: true }),
      );
    });

    it('sends an approved job back to pending and disabled when its content changes under required approval', async () => {
      vi.stubEnv('SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL', 'true');
      vi.mocked(jobs.get).mockResolvedValue(
        jobFixture({ approvalState: 'approved' }),
      );

      await service.update('user-1', {
        enabled: true,
        id: 'j1',
        prompt: 'something new',
      });

      expect(jobs.update).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({ approvalState: 'pending', enabled: false }),
      );
    });

    it('keeps an approved job approved when only enabled changes', async () => {
      vi.stubEnv('SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL', 'true');
      vi.mocked(jobs.get).mockResolvedValue(
        jobFixture({ approvalState: 'approved' }),
      );

      await service.update('user-1', { enabled: false, id: 'j1' });

      expect(jobs.update).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({
          approvalState: undefined,
          enabled: false,
        }),
      );
    });
  });

  describe('delete', () => {
    it('deletes an agent-created job the caller owns', async () => {
      await expect(service.delete('user-1', 'j1')).resolves.toBe(true);
    });

    it('refuses a job created through the UI', async () => {
      vi.mocked(jobs.get).mockResolvedValue(jobFixture({ createdVia: 'ui' }));

      await expect(service.delete('user-1', 'j1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(jobs.delete).not.toHaveBeenCalled();
    });

    it('refuses a missing job', async () => {
      vi.mocked(jobs.get).mockResolvedValue(null);

      await expect(service.delete('user-1', 'j1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('runNow', () => {
    it('runs a human-created job the caller owns', async () => {
      vi.mocked(jobs.get).mockResolvedValue(jobFixture({ createdVia: 'ui' }));

      await service.runNow('user-1', 'j1');

      expect(jobs.runNow).toHaveBeenCalledWith('j1');
    });

    it('refuses someone else’s job', async () => {
      vi.mocked(jobs.get).mockResolvedValue(
        jobFixture({ ownerUserId: 'user-2' }),
      );

      await expect(service.runNow('user-1', 'j1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(jobs.runNow).not.toHaveBeenCalled();
    });

    it('refuses a job awaiting approval, so run-now cannot sidestep it', async () => {
      vi.mocked(jobs.get).mockResolvedValue(
        jobFixture({ approvalState: 'pending' }),
      );

      await expect(service.runNow('user-1', 'j1')).rejects.toMatchObject({
        extensions: { code: 'SCHEDULED_AGENT_JOB_APPROVAL_PENDING' },
      });
      expect(jobs.runNow).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('lists only the caller’s jobs', async () => {
      await service.list('user-1');

      expect(jobs.list).toHaveBeenCalledWith('user-1');
    });
  });
});
