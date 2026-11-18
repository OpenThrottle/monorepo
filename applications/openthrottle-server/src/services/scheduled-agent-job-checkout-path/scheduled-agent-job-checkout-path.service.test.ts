import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RepositoryCheckoutsRepository } from '@openthrottle/nestjs-repositories-server';
import type { RepositoryCheckoutsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createRepositoryCheckoutsRepositoryMock,
  repositoryCheckoutsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ScheduledAgentJobCheckoutPathService } from './scheduled-agent-job-checkout-path.service.ts';

describe('ScheduledAgentJobCheckoutPathService', () => {
  let service: ScheduledAgentJobCheckoutPathService;
  let checkouts: RepositoryCheckoutsRepositoryMock;

  beforeEach(async () => {
    checkouts = createRepositoryCheckoutsRepositoryMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ScheduledAgentJobCheckoutPathService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: RepositoryCheckoutsRepository, useValue: checkouts },
      ],
    }).compile();

    service = moduleRef.get(ScheduledAgentJobCheckoutPathService);
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
});
