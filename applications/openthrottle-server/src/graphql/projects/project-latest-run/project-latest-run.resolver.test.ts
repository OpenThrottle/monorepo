import type {
  PlansRepository,
  ProjectRunsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  createProjectRunsRepositoryMock,
  projectRunsFactory,
  projectsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ProjectObject } from '../project.object.ts';
import { ProjectRunLoaders } from '../project-run/loaders/loaders.service.ts';
import { ProjectLatestRunResolver } from './project-latest-run.resolver.ts';

const project = (id: string): ProjectObject => {
  return asMock<ProjectObject>({ ...projectsFactory.build({ id }) });
};

describe('ProjectLatestRunResolver', () => {
  const projectRuns = createProjectRunsRepositoryMock();
  let resolver: ProjectLatestRunResolver;

  beforeEach(() => {
    projectRuns.findLatestByProjectIds.mockReset();
    resolver = new ProjectLatestRunResolver(
      new ProjectRunLoaders(
        asMock<PlansRepository>(createPlansRepositoryMock()),
        asMock<ProjectRunsRepository>(projectRuns),
      ),
    );
  });

  describe('when the newest run is active', () => {
    it('is both the latest and the active run, from one query', async () => {
      const run = projectRunsFactory.build({
        projectId: 'p1',
        status: 'IN_PROGRESS',
      });
      projectRuns.findLatestByProjectIds.mockResolvedValue(
        new Map([['p1', run]]),
      );

      const [latest, active] = await Promise.all([
        resolver.latestProjectRun(project('p1')),
        resolver.activeProjectRun(project('p1')),
      ]);

      expect(latest?.id).toBe(run.id);
      expect(active?.id).toBe(run.id);
      expect(projectRuns.findLatestByProjectIds).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the newest run is settled', () => {
    it('is the latest run but not the active one', async () => {
      const run = projectRunsFactory.build({
        projectId: 'p1',
        status: 'STOPPED',
      });
      projectRuns.findLatestByProjectIds.mockResolvedValue(
        new Map([['p1', run]]),
      );

      await expect(
        resolver.latestProjectRun(project('p1')),
      ).resolves.toMatchObject({
        status: 'STOPPED',
      });
      await expect(
        resolver.activeProjectRun(project('p1')),
      ).resolves.toBeNull();
    });
  });

  describe('when the project never ran', () => {
    it('is null for both', async () => {
      projectRuns.findLatestByProjectIds.mockResolvedValue(new Map());

      await expect(
        resolver.latestProjectRun(project('p1')),
      ).resolves.toBeNull();
      await expect(
        resolver.activeProjectRun(project('p1')),
      ).resolves.toBeNull();
    });
  });
});
