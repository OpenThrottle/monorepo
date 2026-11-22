import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { ProjectRunsRepository } from '@openthrottle/nestjs-repositories-server';
import {
  createProjectRunsRepositoryMock,
  projectRunsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProjectRunAdvanceService } from '../../services/project-run-advance/project-run-advance.service.ts';
import { ProjectRunsProcessor } from './project-runs.processor.ts';
import type { ProjectRunsJob } from './project-runs.types.ts';

describe('ProjectRunsProcessor', () => {
  const advance = vi.fn();
  const projectRuns = createProjectRunsRepositoryMock();
  let processor: ProjectRunsProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    advance.mockResolvedValue({ kind: 'waiting' });
    processor = new ProjectRunsProcessor(
      createMock<LoggerService>(),
      createMock<ProjectRunAdvanceService>({ advance }),
      createMock<ProjectRunsRepository>(projectRuns),
    );
  });

  describe('an advance job', () => {
    it('advances the one project run it names', async () => {
      await processor.process(
        createMock<ProjectRunsJob>({
          data: { kind: 'advance', projectRunId: 'pr-1' },
        }),
      );

      expect(advance).toHaveBeenCalledExactlyOnceWith('pr-1');
      expect(projectRuns.findActive).not.toHaveBeenCalled();
    });
  });

  describe('the reconcile job', () => {
    it('advances every active project run, and only those', async () => {
      projectRuns.findActive.mockResolvedValue([
        projectRunsFactory.build({ id: 'pr-1', status: 'IN_PROGRESS' }),
        projectRunsFactory.build({ id: 'pr-2', status: 'QUEUED' }),
      ]);

      await processor.process(
        createMock<ProjectRunsJob>({ data: { kind: 'reconcile' } }),
      );

      expect(advance.mock.calls).toEqual([['pr-1'], ['pr-2']]);
    });
  });
});
