import { createMock } from '@golevelup/ts-vitest';
import type { ConfigService } from '@nestjs/config';
import type { GitHubService } from '@openthrottle/nestjs-github';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsRepository,
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSession,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createRepositoryCheckoutsRepositoryMock,
  createWorkArtifactsRepositoryMock,
  createWorkSessionsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { GitHubForgeService } from '../../../services/source-control/github-forge/github-forge.service.ts';
import { GitLabForgeService } from '../../../services/source-control/gitlab-forge/gitlab-forge.service.ts';
import { SourceControlService } from '../../../services/source-control/source-control.service.ts';
import type { PlanRunObject } from '../plan.object.ts';
import { PlanRunLoaders } from './loaders/loaders.service.ts';
import { PlanRunObjectResolver } from './plan-run-object.resolver.ts';

const run = (overrides: Partial<PlanRunObject> = {}): PlanRunObject => {
  return asMock<PlanRunObject>({
    checkoutId: 'checkout-1',
    id: 'run-1',
    ...overrides,
  });
};

const session = (id: string, planRunId: string): WorkSession => {
  return asMock<WorkSession>({ id, planRunId });
};

const artifact = (
  sessionId: string,
  lifecycle: WorkArtifact['lifecycle'],
  payload: WorkArtifact['payload'],
): WorkArtifact => {
  return asMock<WorkArtifact>({ lifecycle, payload, sessionId });
};

describe('PlanRunObjectResolver', () => {
  const checkoutsRepositoryMock = createRepositoryCheckoutsRepositoryMock();
  const checkoutFind = checkoutsRepositoryMock.findBy;
  const workArtifactsRepository = createWorkArtifactsRepositoryMock();
  const workSessionsRepository = createWorkSessionsRepositoryMock();
  const sessionFind = workSessionsRepository.findBy;
  const artifactFind = workArtifactsRepository.findBy;

  const checkoutsRepository = asMock<RepositoryCheckoutsRepository>(
    checkoutsRepositoryMock,
  );
  const sourceControlService = new SourceControlService(
    new GitHubForgeService(createMock<GitHubService>()),
    new GitLabForgeService(createMock<ConfigService>()),
  );

  let resolver: PlanRunObjectResolver;

  beforeEach(() => {
    checkoutFind.mockReset();
    sessionFind.mockReset();
    artifactFind.mockReset();
    // A fresh loader set per test, as a fresh request would get.
    resolver = new PlanRunObjectResolver(
      new PlanRunLoaders(
        checkoutsRepository,
        createMock<WorkArtifactsRepository>(workArtifactsRepository),
        createMock<WorkSessionsRepository>(workSessionsRepository),
      ),
      sourceControlService,
    );
  });

  describe('checkout', () => {
    it('returns null when the run has no checkoutId', async () => {
      await expect(
        resolver.checkout(run({ checkoutId: null })),
      ).resolves.toBeNull();
      expect(checkoutFind).not.toHaveBeenCalled();
    });

    it('resolves the checkout to filesystemPath, kind, and displayName', async () => {
      checkoutFind.mockResolvedValue([
        createMock<RepositoryCheckout>({
          displayName: 'feature-wt',
          filesystemPath: '/Users/dev/openthrottle-worktrees/feature',
          id: 'checkout-1',
          kind: 'worktree',
        }),
      ]);

      await expect(resolver.checkout(run())).resolves.toEqual({
        displayName: 'feature-wt',
        filesystemPath: '/Users/dev/openthrottle-worktrees/feature',
        kind: 'worktree',
      });
      expect(checkoutFind).toHaveBeenCalledTimes(1);
    });

    it('returns null when the referenced checkout no longer exists', async () => {
      checkoutFind.mockResolvedValue([]);
      await expect(resolver.checkout(run())).resolves.toBeNull();
    });
  });

  describe('pullRequest', () => {
    it('returns null when the run has no work sessions', async () => {
      sessionFind.mockResolvedValue([]);
      await expect(resolver.pullRequest(run())).resolves.toBeNull();
      expect(artifactFind).not.toHaveBeenCalled();
    });

    it('resolves the latest pull_request artifact into repo/number/state/url', async () => {
      sessionFind.mockResolvedValue([session('session-1', 'run-1')]);
      artifactFind.mockResolvedValue([
        artifact('session-1', 'merged', {
          number: 42,
          repo: 'OpenThrottle/monorepo',
        }),
      ]);

      await expect(resolver.pullRequest(run())).resolves.toEqual({
        number: 42,
        repo: 'OpenThrottle/monorepo',
        state: 'merged',
        url: 'https://github.com/OpenThrottle/monorepo/pull/42',
      });
      // Queries only pull_request artifacts for the run's sessions.
      expect(artifactFind).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'pull_request' }),
        }),
      );
    });

    it('returns null when no pull_request artifact exists for the sessions', async () => {
      sessionFind.mockResolvedValue([session('session-1', 'run-1')]);
      artifactFind.mockResolvedValue([]);
      await expect(resolver.pullRequest(run())).resolves.toBeNull();
    });

    it('returns null when the artifact payload is malformed', async () => {
      sessionFind.mockResolvedValue([session('session-1', 'run-1')]);
      artifactFind.mockResolvedValue([
        artifact('session-1', 'open', { number: 0, repo: '' }),
      ]);
      await expect(resolver.pullRequest(run())).resolves.toBeNull();
    });
  });

  describe('batching across a list of runs', () => {
    it('resolves checkout and pullRequest for many runs in three queries', async () => {
      checkoutFind.mockResolvedValue([
        createMock<RepositoryCheckout>({
          displayName: 'a',
          filesystemPath: '/a',
          id: 'checkout-a',
          kind: 'worktree',
        }),
      ]);
      sessionFind.mockResolvedValue([
        session('session-1', 'run-1'),
        session('session-2', 'run-2'),
        session('session-2b', 'run-2'),
      ]);
      // Newest first, as the loader asks for: run-2's 7 beats its older 5.
      artifactFind.mockResolvedValue([
        artifact('session-2b', 'open', { number: 7, repo: 'o/r' }),
        artifact('session-1', 'merged', { number: 3, repo: 'o/r' }),
        artifact('session-2', 'closed', { number: 5, repo: 'o/r' }),
      ]);

      const runs = ['run-1', 'run-2', 'run-3'].map((id) => {
        return run({ checkoutId: 'checkout-a', id });
      });
      const [checkouts, pullRequests] = await Promise.all([
        Promise.all(runs.map((r) => resolver.checkout(r))),
        Promise.all(runs.map((r) => resolver.pullRequest(r))),
      ]);

      expect(checkoutFind).toHaveBeenCalledTimes(1);
      expect(sessionFind).toHaveBeenCalledTimes(1);
      expect(artifactFind).toHaveBeenCalledTimes(1);
      expect(checkouts.map((c) => c?.filesystemPath)).toEqual([
        '/a',
        '/a',
        '/a',
      ]);
      expect(pullRequests.map((pr) => pr?.number ?? null)).toEqual([
        3,
        7,
        null,
      ]);
    });
  });
});
