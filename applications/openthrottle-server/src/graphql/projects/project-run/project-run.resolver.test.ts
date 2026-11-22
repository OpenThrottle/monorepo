import { createMock } from '@golevelup/ts-vitest';
import type {
  PlansRepository,
  ProjectRunsRepository,
  ProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  createProjectRunsRepositoryMock,
  createProjectsRepositoryMock,
  plansFactory,
  projectRunsFactory,
  projectsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { GraphQLError } from 'graphql';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EffectiveUserResolutionService } from '../../../services/effective-user-resolution/effective-user-resolution.service.ts';
import type { ProjectRunAdvanceService } from '../../../services/project-run-advance/project-run-advance.service.ts';
import { ProjectRunLoaders } from './loaders/loaders.service.ts';
import { PROJECT_RUN_ERROR_CODE } from './project-run.constants.ts';
import { ProjectRunResolver } from './project-run.resolver.ts';

const PROJECT_ID = 'project-1';
const USER_ID = 'user-1';

const codeOf = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error instanceof GraphQLError ? error.extensions.code : error;
  }

  return undefined;
};

describe('ProjectRunResolver', () => {
  const plans = createPlansRepositoryMock();
  const projectRuns = createProjectRunsRepositoryMock();
  const projects = createProjectsRepositoryMock();
  const advance = vi.fn();
  const resolveEffectiveUserId = vi.fn();
  let resolver: ProjectRunResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    projects.findOne.mockResolvedValue({
      ...projectsFactory.build({ id: PROJECT_ID }),
      plans: [],
      tasks: [],
    });
    projectRuns.findActiveByProjectId.mockResolvedValue(null);
    plans.listInProject.mockResolvedValue([
      plansFactory.build({ projectId: PROJECT_ID, status: 'PENDING' }),
    ]);
    resolveEffectiveUserId.mockResolvedValue(USER_ID);
    advance.mockResolvedValue({ kind: 'enqueued' });

    resolver = new ProjectRunResolver(
      createMock<EffectiveUserResolutionService>({ resolveEffectiveUserId }),
      new ProjectRunLoaders(
        asMock<PlansRepository>(plans),
        asMock<ProjectRunsRepository>(projectRuns),
      ),
      asMock<PlansRepository>(plans),
      createMock<ProjectRunAdvanceService>({ advance }),
      asMock<ProjectRunsRepository>(projectRuns),
      asMock<ProjectsRepository>(projects),
    );
  });

  describe('runProject', () => {
    it('creates the run as the effective user and advances it at once', async () => {
      const created = projectRunsFactory.build({ projectId: PROJECT_ID });
      const advanced = {
        ...created,
        currentPlanId: 'plan-1',
        status: 'IN_PROGRESS' as const,
      };
      projectRuns.create.mockResolvedValue(created);
      projectRuns.findRunById.mockResolvedValue(advanced);

      const result = await resolver.runProject(
        { projectId: PROJECT_ID },
        'mcp-service-account',
      );

      expect(resolveEffectiveUserId).toHaveBeenCalledWith(
        'mcp-service-account',
      );
      expect(projectRuns.create).toHaveBeenCalledWith({
        actorUserId: USER_ID,
        projectId: PROJECT_ID,
      });
      expect(advance).toHaveBeenCalledWith(created.id);
      expect(result).toMatchObject({
        currentPlanId: 'plan-1',
        id: created.id,
        status: 'IN_PROGRESS',
      });
    });

    it('refuses an unknown project with NOT_FOUND', async () => {
      projects.findOne.mockResolvedValue(null);

      await expect(
        codeOf(resolver.runProject({ projectId: PROJECT_ID })),
      ).resolves.toBe(PROJECT_RUN_ERROR_CODE.NOT_FOUND);
    });

    it('refuses a project that already has an active run', async () => {
      projectRuns.findActiveByProjectId.mockResolvedValue(
        projectRunsFactory.build({ status: 'IN_PROGRESS' }),
      );

      await expect(
        codeOf(resolver.runProject({ projectId: PROJECT_ID })),
      ).resolves.toBe(PROJECT_RUN_ERROR_CODE.ACTIVE);
      expect(projectRuns.create).not.toHaveBeenCalled();
    });

    it('maps a lost race on the one-active-run index to PROJECT_RUN_ACTIVE', async () => {
      projectRuns.create.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('dup'), { code: '23505' }),
        ),
      );

      await expect(
        codeOf(resolver.runProject({ projectId: PROJECT_ID })),
      ).resolves.toBe(PROJECT_RUN_ERROR_CODE.ACTIVE);
      expect(advance).not.toHaveBeenCalled();
    });

    it('refuses a project with no plan left to run', async () => {
      plans.listInProject.mockResolvedValue([
        plansFactory.build({ status: 'COMPLETED' }),
        plansFactory.build({ status: 'SKIPPED' }),
      ]);

      await expect(
        codeOf(resolver.runProject({ projectId: PROJECT_ID })),
      ).resolves.toBe(PROJECT_RUN_ERROR_CODE.NOTHING_TO_RUN);
    });
  });

  describe('cancelProjectRun', () => {
    it('stamps the cancel marker and advances the run', async () => {
      const run = projectRunsFactory.build({ status: 'IN_PROGRESS' });
      projectRuns.findRunById
        .mockResolvedValueOnce(run)
        .mockResolvedValueOnce({ ...run, status: 'CANCELLED' });
      projectRuns.stampCancelRequested.mockResolvedValue(true);

      const result = await resolver.cancelProjectRun(
        { projectRunId: run.id },
        USER_ID,
      );

      expect(projectRuns.stampCancelRequested).toHaveBeenCalledWith(
        run.id,
        USER_ID,
      );
      expect(advance).toHaveBeenCalledWith(run.id);
      expect(result.status).toBe('CANCELLED');
    });

    it('returns a settled run unchanged without advancing it', async () => {
      const run = projectRunsFactory.build({ status: 'COMPLETED' });
      projectRuns.findRunById.mockResolvedValue(run);
      projectRuns.stampCancelRequested.mockResolvedValue(false);

      const result = await resolver.cancelProjectRun({ projectRunId: run.id });

      expect(advance).not.toHaveBeenCalled();
      expect(result.status).toBe('COMPLETED');
    });

    it('refuses an unknown run with NOT_FOUND', async () => {
      projectRuns.findRunById.mockResolvedValue(null);

      await expect(
        codeOf(resolver.cancelProjectRun({ projectRunId: 'nope' })),
      ).resolves.toBe(PROJECT_RUN_ERROR_CODE.NOT_FOUND);
    });
  });

  describe('plan fields', () => {
    it('resolves currentPlan and stoppedByPlan through one batched lookup', async () => {
      const current = plansFactory.build({ id: 'plan-1' });
      const stopper = plansFactory.build({ id: 'plan-2' });
      plans.findBy.mockResolvedValue([current, stopper]);
      const run = {
        ...projectRunsFactory.build(),
        currentPlanId: 'plan-1',
        stoppedByPlanId: 'plan-2',
      };

      const [a, b] = await Promise.all([
        resolver.currentPlan(run),
        resolver.stoppedByPlan(run),
      ]);

      expect(a).toBe(current);
      expect(b).toBe(stopper);
      expect(plans.findBy).toHaveBeenCalledTimes(1);
    });

    it('is null when the run points at no plan', async () => {
      const run = projectRunsFactory.build();

      await expect(resolver.currentPlan(run)).resolves.toBeNull();
      await expect(resolver.stoppedByPlan(run)).resolves.toBeNull();
    });
  });

  describe('projectRun', () => {
    it('reads one run, or null', async () => {
      const run = projectRunsFactory.build();
      projectRuns.findRunById
        .mockResolvedValueOnce(run)
        .mockResolvedValueOnce(null);

      await expect(resolver.projectRun(run.id)).resolves.toMatchObject({
        id: run.id,
      });
      await expect(resolver.projectRun('nope')).resolves.toBeNull();
    });
  });
});
