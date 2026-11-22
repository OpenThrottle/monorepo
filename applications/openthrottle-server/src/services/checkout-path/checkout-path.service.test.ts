import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RepositoryCheckoutsRepository } from '@openthrottle/nestjs-repositories-server';
import type { RepositoryCheckoutsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createRepositoryCheckoutsRepositoryMock,
  repositoryCheckoutsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckoutPathService } from './checkout-path.service.ts';

describe('CheckoutPathService', () => {
  let service: CheckoutPathService;
  let checkouts: RepositoryCheckoutsRepositoryMock;

  beforeEach(async () => {
    checkouts = createRepositoryCheckoutsRepositoryMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CheckoutPathService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: RepositoryCheckoutsRepository, useValue: checkouts },
      ],
    }).compile();

    service = moduleRef.get(CheckoutPathService);
  });

  it('resolves an owned checkout to its filesystem path', async () => {
    checkouts.findByIdForUser.mockResolvedValue(
      repositoryCheckoutsFactory.build({
        filesystemPath: '/Users/matt/Development/openthrottle',
      }),
    );

    const result = await service.resolve({
      checkoutId: 'checkout-1',
      ownerUserId: 'user-1',
    });

    expect(checkouts.findByIdForUser).toHaveBeenCalledWith(
      'checkout-1',
      'user-1',
    );
    // toContainerPath is identity without the workspace bridge configured.
    expect(result).toEqual({ path: '/Users/matt/Development/openthrottle' });
  });

  it('reports not-found when the checkout is not the owner’s', async () => {
    checkouts.findByIdForUser.mockResolvedValue(null);

    const result = await service.resolve({
      checkoutId: 'someone-elses',
      ownerUserId: 'user-1',
    });

    expect(result).toEqual({ error: 'not-found' });
  });

  it('falls back to an unscoped lookup for an owner-less (system-seeded) schedule', async () => {
    checkouts.findCheckoutById.mockResolvedValue(
      repositoryCheckoutsFactory.build({ filesystemPath: '/srv/workspace' }),
    );

    const result = await service.resolve({
      checkoutId: 'checkout-1',
      ownerUserId: null,
    });

    expect(checkouts.findByIdForUser).not.toHaveBeenCalled();
    expect(checkouts.findCheckoutById).toHaveBeenCalledWith('checkout-1');
    expect(result).toEqual({ path: '/srv/workspace' });
  });

  describe('resolveRunWorkspace', () => {
    describe('by checkoutId', () => {
      it('resolves an owned checkout to both path forms', async () => {
        checkouts.findByIdForUser.mockResolvedValue(
          repositoryCheckoutsFactory.build({
            filesystemPath: '/Users/matt/Development/openthrottle',
            id: 'checkout-1',
            repositoryId: 'repo-1',
          }),
        );

        const result = await service.resolveRunWorkspace({
          actorUserId: 'user-1',
          checkoutId: ' checkout-1 ',
          repositoryId: 'repo-ignored',
        });

        expect(checkouts.findByIdForUser).toHaveBeenCalledWith(
          'checkout-1',
          'user-1',
        );
        expect(checkouts.findByRepositoryIdForUser).not.toHaveBeenCalled();
        // toContainerPath is identity without the workspace bridge configured.
        expect(result).toEqual({
          checkoutId: 'checkout-1',
          hostPath: '/Users/matt/Development/openthrottle',
          kind: 'resolved',
          processPath: '/Users/matt/Development/openthrottle',
          repositoryId: 'repo-1',
        });
      });

      it('splits host and process paths under the workspace bridge', async () => {
        vi.stubEnv('OPENTHROTTLE_HOST_WORKSPACES_DIR', '/Users/matt');
        vi.stubEnv('OPENTHROTTLE_CONTAINER_WORKSPACES_DIR', '/workspaces');
        checkouts.findByIdForUser.mockResolvedValue(
          repositoryCheckoutsFactory.build({
            filesystemPath: '/Users/matt/Development/openthrottle',
          }),
        );

        const result = await service.resolveRunWorkspace({
          actorUserId: 'user-1',
          checkoutId: 'checkout-1',
          repositoryId: null,
        });
        vi.unstubAllEnvs();

        expect(result).toMatchObject({
          hostPath: '/Users/matt/Development/openthrottle',
          kind: 'resolved',
          processPath: '/workspaces/Development/openthrottle',
        });
      });

      it('rejects a checkout that is missing or not the actor’s', async () => {
        checkouts.findByIdForUser.mockResolvedValue(null);

        const result = await service.resolveRunWorkspace({
          actorUserId: 'user-1',
          checkoutId: 'someone-elses',
          repositoryId: null,
        });

        expect(result).toEqual({
          kind: 'rejected',
          message: 'Checkout not found for this user: someone-elses',
          reason: 'checkout-not-found',
        });
      });

      it('rejects an unauthenticated actor without a lookup', async () => {
        const result = await service.resolveRunWorkspace({
          actorUserId: null,
          checkoutId: 'checkout-1',
          repositoryId: null,
        });

        expect(checkouts.findByIdForUser).not.toHaveBeenCalled();
        expect(checkouts.findCheckoutById).not.toHaveBeenCalled();
        expect(result).toEqual({
          kind: 'rejected',
          message: 'checkoutId can only be resolved for an authenticated user',
          reason: 'unauthenticated',
        });
      });
    });

    describe('by repositoryId', () => {
      it('resolves the actor’s single checkout of the repository', async () => {
        checkouts.findByRepositoryIdForUser.mockResolvedValue([
          repositoryCheckoutsFactory.build({
            filesystemPath: '/srv/repo',
            id: 'checkout-2',
          }),
        ]);

        const result = await service.resolveRunWorkspace({
          actorUserId: 'user-1',
          checkoutId: '  ',
          repositoryId: 'repo-1',
        });

        expect(checkouts.findByRepositoryIdForUser).toHaveBeenCalledWith(
          'repo-1',
          'user-1',
        );
        expect(result).toEqual({
          checkoutId: 'checkout-2',
          hostPath: '/srv/repo',
          kind: 'resolved',
          processPath: '/srv/repo',
          repositoryId: 'repo-1',
        });
      });

      it('rejects a repository the actor has no checkout of', async () => {
        checkouts.findByRepositoryIdForUser.mockResolvedValue([]);

        const result = await service.resolveRunWorkspace({
          actorUserId: 'user-1',
          checkoutId: null,
          repositoryId: 'repo-1',
        });

        expect(result).toEqual({
          kind: 'rejected',
          message: `No checkout for repository repo-1; add a folder for it first`,
          reason: 'no-checkout',
        });
      });

      it('rejects a repository with several checkouts', async () => {
        checkouts.findByRepositoryIdForUser.mockResolvedValue(
          repositoryCheckoutsFactory.buildList(2),
        );

        const result = await service.resolveRunWorkspace({
          actorUserId: 'user-1',
          checkoutId: null,
          repositoryId: 'repo-1',
        });

        expect(result).toEqual({
          kind: 'rejected',
          message: `Repository repo-1 has multiple checkouts; specify a checkoutId`,
          reason: 'multiple-checkouts',
        });
      });

      it('rejects an unauthenticated actor without a lookup', async () => {
        const result = await service.resolveRunWorkspace({
          actorUserId: undefined,
          checkoutId: undefined,
          repositoryId: 'repo-1',
        });

        expect(checkouts.findByRepositoryIdForUser).not.toHaveBeenCalled();
        expect(result).toEqual({
          kind: 'rejected',
          message: `repositoryId can only be resolved for an authenticated user`,
          reason: 'unauthenticated',
        });
      });
    });

    it('reports no reference when neither id is given', async () => {
      const result = await service.resolveRunWorkspace({
        actorUserId: null,
        checkoutId: '',
        repositoryId: undefined,
      });

      expect(result).toEqual({ kind: 'no-reference' });
    });
  });
});
