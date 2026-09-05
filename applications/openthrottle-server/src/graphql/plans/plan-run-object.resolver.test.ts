import { createMock } from '@golevelup/ts-vitest';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsService,
  WorkArtifact,
  WorkLedgerService,
  WorkSession,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanRunObjectResolver } from './plan-run-object.resolver';
import type { PlanRunObject } from './plan.object';

const run = (overrides: Partial<PlanRunObject> = {}): PlanRunObject =>
  asMock<PlanRunObject>({
    checkoutId: 'checkout-1',
    id: 'run-1',
    ...overrides,
  });

describe('PlanRunObjectResolver', () => {
  const checkoutFindById = vi.fn();
  const sessionFind = vi.fn();
  const artifactFindOne = vi.fn();

  const checkoutsService = asMock<RepositoryCheckoutsService>({
    findById: checkoutFindById,
  });
  const workLedgerService = asMock<WorkLedgerService>({
    getArtifactRepository: () => ({ findOne: artifactFindOne }),
    getSessionRepository: () => ({ find: sessionFind }),
  });

  const resolver = new PlanRunObjectResolver(
    checkoutsService,
    workLedgerService,
  );

  beforeEach(() => {
    checkoutFindById.mockReset();
    sessionFind.mockReset();
    artifactFindOne.mockReset();
  });

  describe('checkout', () => {
    it('returns null when the run has no checkoutId', async () => {
      await expect(
        resolver.checkout(run({ checkoutId: null })),
      ).resolves.toBeNull();
      expect(checkoutFindById).not.toHaveBeenCalled();
    });

    it('resolves the checkout to filesystemPath, kind, and displayName', async () => {
      checkoutFindById.mockResolvedValue(
        createMock<RepositoryCheckout>({
          displayName: 'feature-wt',
          filesystemPath: '/Users/dev/openthrottle-worktrees/feature',
          kind: 'worktree',
        }),
      );

      await expect(resolver.checkout(run())).resolves.toEqual({
        displayName: 'feature-wt',
        filesystemPath: '/Users/dev/openthrottle-worktrees/feature',
        kind: 'worktree',
      });
      expect(checkoutFindById).toHaveBeenCalledWith('checkout-1');
    });

    it('returns null when the referenced checkout no longer exists', async () => {
      checkoutFindById.mockResolvedValue(null);
      await expect(resolver.checkout(run())).resolves.toBeNull();
    });
  });

  describe('pullRequest', () => {
    it('returns null when the run has no work sessions', async () => {
      sessionFind.mockResolvedValue([]);
      await expect(resolver.pullRequest(run())).resolves.toBeNull();
      expect(artifactFindOne).not.toHaveBeenCalled();
    });

    it('resolves the latest pull_request artifact into repo/number/state/url', async () => {
      sessionFind.mockResolvedValue([asMock<WorkSession>({ id: 'session-1' })]);
      artifactFindOne.mockResolvedValue(
        asMock<WorkArtifact>({
          lifecycle: 'merged',
          payload: { number: 42, repo: 'OpenThrottle/monorepo' },
        }),
      );

      await expect(resolver.pullRequest(run())).resolves.toEqual({
        number: 42,
        repo: 'OpenThrottle/monorepo',
        state: 'merged',
        url: 'https://github.com/OpenThrottle/monorepo/pull/42',
      });
      // Queries only pull_request artifacts for the run's sessions.
      expect(artifactFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'pull_request' }),
        }),
      );
    });

    it('returns null when no pull_request artifact exists for the sessions', async () => {
      sessionFind.mockResolvedValue([asMock<WorkSession>({ id: 'session-1' })]);
      artifactFindOne.mockResolvedValue(null);
      await expect(resolver.pullRequest(run())).resolves.toBeNull();
    });

    it('returns null when the artifact payload is malformed', async () => {
      sessionFind.mockResolvedValue([asMock<WorkSession>({ id: 'session-1' })]);
      artifactFindOne.mockResolvedValue(
        asMock<WorkArtifact>({
          lifecycle: 'open',
          payload: { number: 0, repo: '' },
        }),
      );
      await expect(resolver.pullRequest(run())).resolves.toBeNull();
    });
  });
});
