import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  ScheduledAgentJob,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationsService } from '../../notifications/notifications.service.ts';
import type { ScheduledRunFailureChannel } from './scheduled-agent-job-failure-channel.ts';
import {
  ScheduledAgentJobFailureNotifierService,
  type ScheduledRunFailureInput,
  scheduledRunFailureLink,
  scheduledRunFailureMessage,
} from './scheduled-agent-job-failure-notifier.service.ts';

const FAILED_RUN: ScheduledRunFailureInput = {
  errorMessage: 'Agent exited with code 2',
  reason: 'failed',
  runCount: 1,
  runId: 'run-1',
  scheduledAgentJobId: 'sched-1',
};

describe('ScheduledAgentJobFailureNotifierService', () => {
  let jobsService: ScheduledAgentJobsService;
  let notifications: NotificationsService;
  let logger: LoggerService;
  let channel: ScheduledRunFailureChannel;

  const build = (
    channels: readonly ScheduledRunFailureChannel[],
  ): ScheduledAgentJobFailureNotifierService => {
    return new ScheduledAgentJobFailureNotifierService(
      logger,
      jobsService,
      notifications,
      channels,
    );
  };

  beforeEach(() => {
    jobsService = createMock<ScheduledAgentJobsService>({
      findJobById: vi.fn().mockResolvedValue(
        createMock<ScheduledAgentJob>({
          name: 'Nightly triage',
          ownerUserId: 'user-1',
        }),
      ),
    });
    notifications = createMock<NotificationsService>({
      emitScheduledRunFailed: vi.fn(),
    });
    logger = createMock<LoggerService>({ warn: vi.fn() });
    channel = { deliver: vi.fn().mockResolvedValue(undefined), name: 'slack' };
  });

  describe('when a run fails', () => {
    it('emits an in-app error notice for the schedule owner, linking to the run', async () => {
      await build([]).notify(FAILED_RUN);

      expect(
        notifications.emitScheduledRunFailed,
      ).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          link: '/schedule/sched-1/runs/run-1',
          message: `Scheduled job "Nightly triage" failed: Agent exited with code 2`,
          ownerUserId: 'user-1',
          reason: 'failed',
          runCount: 1,
          runId: 'run-1',
          scheduleName: 'Nightly triage',
          scheduledAgentJobId: 'sched-1',
          severity: 'error',
        }),
      );
    });

    it('hands the same notice to every registered channel', async () => {
      await build([channel]).notify(FAILED_RUN);

      expect(channel.deliver).toHaveBeenCalledExactlyOnceWith(
        vi.mocked(notifications.emitScheduledRunFailed).mock.calls[0]?.[0],
      );
    });
  });

  describe('when a channel fails', () => {
    it('still delivers to the other channels and logs the failure', async () => {
      const broken: ScheduledRunFailureChannel = {
        deliver: vi.fn().mockRejectedValue(new Error('webhook 500')),
        name: 'broken',
      };

      await expect(
        build([broken, channel]).notify(FAILED_RUN),
      ).resolves.toBeUndefined();

      expect(channel.deliver).toHaveBeenCalledOnce();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"broken"'),
        expect.any(String),
      );
    });
  });

  describe('when several fires were missed', () => {
    it('sends one warning that links to the schedule and counts them', async () => {
      await build([]).notify({
        errorMessage: 'Missed: the server was not running.',
        reason: 'missed',
        runCount: 3,
        runId: undefined,
        scheduledAgentJobId: 'sched-1',
      });

      expect(notifications.emitScheduledRunFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          link: '/schedule/sched-1',
          message: `Scheduled job "Nightly triage" missed 3 runs: the server was not running.`,
          runCount: 3,
          severity: 'warning',
        }),
      );
    });
  });

  describe('when nothing was recorded', () => {
    it('sends nothing and does not read the schedule', async () => {
      await build([channel]).notify({ ...FAILED_RUN, runCount: 0 });

      expect(jobsService.findJobById).not.toHaveBeenCalled();
      expect(notifications.emitScheduledRunFailed).not.toHaveBeenCalled();
      expect(channel.deliver).not.toHaveBeenCalled();
    });
  });

  describe('when the schedule is gone', () => {
    it('sends nothing', async () => {
      vi.mocked(jobsService.findJobById).mockResolvedValue(null);

      await build([channel]).notify(FAILED_RUN);

      expect(notifications.emitScheduledRunFailed).not.toHaveBeenCalled();
      expect(channel.deliver).not.toHaveBeenCalled();
    });
  });

  describe('when reading the schedule throws', () => {
    it('logs and resolves, so the caller is never interrupted', async () => {
      vi.mocked(jobsService.findJobById).mockRejectedValue(
        new Error('db down'),
      );

      await expect(build([]).notify(FAILED_RUN)).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('db down'),
        expect.any(String),
      );
    });
  });
});

describe('scheduledRunFailureMessage', () => {
  it('names a timeout', () => {
    expect(
      scheduledRunFailureMessage({
        errorMessage: 'Run timed out',
        reason: 'timed_out',
        runCount: 1,
        scheduleName: 'Docs sweep',
      }),
    ).toBe('Scheduled job "Docs sweep" timed out: Run timed out');
  });

  it('reads cleanly with no error detail', () => {
    expect(
      scheduledRunFailureMessage({
        errorMessage: null,
        reason: 'missed',
        runCount: 1,
        scheduleName: 'Docs sweep',
      }),
    ).toBe('Scheduled job "Docs sweep" missed a run');
  });
});

describe('scheduledRunFailureLink', () => {
  it('links to the schedule when there is no single run', () => {
    expect(
      scheduledRunFailureLink({
        runCount: 1,
        runId: undefined,
        scheduledAgentJobId: 'sched-1',
      }),
    ).toBe('/schedule/sched-1');
  });
});
