import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { CheckoutDiffResolver } from './checkout-diff.resolver.ts';
import { CheckoutDiffService } from './checkout-diff.service.ts';

describe('CheckoutDiffResolver', () => {
  const service = { diff: vi.fn(), fileDiff: vi.fn() };
  let resolver: CheckoutDiffResolver;

  beforeEach(async () => {
    service.diff.mockReset();
    service.fileDiff.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CheckoutDiffResolver,
        { provide: CheckoutDiffService, useValue: service },
      ],
    })
      .overrideGuard(GqlPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = moduleRef.get(CheckoutDiffResolver);
  });

  it('passes the current user and checkout id to the diff', async () => {
    service.diff.mockResolvedValue({ available: false });

    await resolver.checkoutDiff('user-1', 'checkout-1');

    expect(service.diff).toHaveBeenCalledWith('user-1', 'checkout-1');
  });

  it('passes the current user, checkout id and path to the file diff', async () => {
    service.fileDiff.mockResolvedValue({ available: false });

    await resolver.checkoutFileDiff('user-1', 'checkout-1', 'a.ts');

    expect(service.fileDiff).toHaveBeenCalledWith(
      'user-1',
      'checkout-1',
      'a.ts',
    );
  });
});
