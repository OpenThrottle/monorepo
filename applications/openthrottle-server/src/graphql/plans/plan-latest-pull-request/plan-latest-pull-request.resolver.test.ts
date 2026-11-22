import { createMock } from '@golevelup/ts-vitest';
import type { ConfigService } from '@nestjs/config';
import type { GitHubService } from '@openthrottle/nestjs-github';
import type {
  PlanRun,
  PlanRunsRepository,
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSession,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlanRunsRepositoryMock,
  createWorkArtifactsRepositoryMock,
  createWorkSessionsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { GitHubForgeService } from '../../../services/source-control/github-forge/github-forge.service.ts';
import { GitLabForgeService } from '../../../services/source-control/gitlab-forge/gitlab-forge.service.ts';
import { SourceControlService } from '../../../services/source-control/source-control.service.ts';
import type { PlanObject } from '../plan.object.ts';
import { PlanLatestPullRequestLoaders } from './loaders/loaders.service.ts';
import { PlanLatestPullRequestResolver } from './plan-latest-pull-request.resolver.ts';

const plan = (id: string): PlanObject => {
  return asMock<PlanObject>({ id });
};

const planRun = (id: string, planId: string): PlanRun => {
  return asMock<PlanRun>({ id, planId });
};

const session = (id: string, planRunId: string): WorkSession => {
  return asMock<WorkSession>({ id, planRunId });
};

const artifact = (
  sessionId: string,
  number: number,
  producedAt: string,
): WorkArtifact => {
  return asMock<WorkArtifact>({
    lifecycle: 'open',
    payload: { number, repo: 'OpenThrottle/monorepo' },
    producedAt: new Date(producedAt),
    sessionId,
  });
};

describe('PlanLatestPullRequestResolver', () => {
  const planRunsRepository = createPlanRunsRepositoryMock();
  const workArtifactsRepository = createWorkArtifactsRepositoryMock();
  const workSessionsRepository = createWorkSessionsRepositoryMock();
  const runFind = planRunsRepository.findBy;
  const sessionFind = workSessionsRepository.findBy;
  const artifactFind = workArtifactsRepository.findBy;
  const sourceControlService = new SourceControlService(
    new GitHubForgeService(createMock<GitHubService>()),
    new GitLabForgeService(createMock<ConfigService>()),
  );

  let resolver: PlanLatestPullRequestResolver;

  beforeEach(() => {
    runFind.mockReset();
    sessionFind.mockReset();
    artifactFind.mockReset();
    resolver = new PlanLatestPullRequestResolver(
      new PlanLatestPullRequestLoaders(
        createMock<PlanRunsRepository>(planRunsRepository),
        createMock<WorkArtifactsRepository>(workArtifactsRepository),
        createMock<WorkSessionsRepository>(workSessionsRepository),
      ),
      sourceControlService,
    );
  });

  describe('when the plan has no runs', () => {
    it('returns null without reading sessions', async () => {
      runFind.mockResolvedValue([]);

      await expect(
        resolver.latestPullRequest(plan('plan-1')),
      ).resolves.toBeNull();
      expect(sessionFind).not.toHaveBeenCalled();
    });
  });

  describe('when a run recorded a pull request', () => {
    it('resolves it into number, repo, state and url', async () => {
      runFind.mockResolvedValue([planRun('run-1', 'plan-1')]);
      sessionFind.mockResolvedValue([session('session-1', 'run-1')]);
      artifactFind.mockResolvedValue([
        artifact('session-1', 42, '2026-11-20T00:00:00Z'),
      ]);

      await expect(resolver.latestPullRequest(plan('plan-1'))).resolves.toEqual(
        {
          number: 42,
          repo: 'OpenThrottle/monorepo',
          state: 'open',
          url: 'https://github.com/OpenThrottle/monorepo/pull/42',
        },
      );
    });
  });

  describe('when the runs recorded no pull request', () => {
    it('returns null', async () => {
      runFind.mockResolvedValue([planRun('run-1', 'plan-1')]);
      sessionFind.mockResolvedValue([session('session-1', 'run-1')]);
      artifactFind.mockResolvedValue([]);

      await expect(
        resolver.latestPullRequest(plan('plan-1')),
      ).resolves.toBeNull();
    });
  });

  describe('batching across a list of plans', () => {
    it('picks the newest PR across each plan’s runs in three queries', async () => {
      runFind.mockResolvedValue([
        planRun('run-1', 'plan-1'),
        planRun('run-2', 'plan-1'),
        planRun('run-3', 'plan-2'),
      ]);
      sessionFind.mockResolvedValue([
        session('session-1', 'run-1'),
        session('session-2', 'run-2'),
        session('session-3', 'run-3'),
      ]);
      artifactFind.mockResolvedValue([
        artifact('session-1', 11, '2026-11-21T00:00:00Z'),
        artifact('session-3', 30, '2026-11-20T12:00:00Z'),
        artifact('session-2', 9, '2026-11-19T00:00:00Z'),
      ]);

      const pullRequests = await Promise.all(
        ['plan-1', 'plan-2', 'plan-3'].map((id) => {
          return resolver.latestPullRequest(plan(id));
        }),
      );

      expect(runFind).toHaveBeenCalledTimes(1);
      expect(sessionFind).toHaveBeenCalledTimes(1);
      expect(artifactFind).toHaveBeenCalledTimes(1);
      expect(pullRequests.map((pr) => pr?.number ?? null)).toEqual([
        11,
        30,
        null,
      ]);
    });
  });
});
