/**
 * @description Unit tests for resolving a caller-supplied path to one of the caller's registered
 * checkouts: exact and nested paths hit, a symlinked path still hits, a registered worktree nested
 * inside a registered primary wins on depth, a sibling sharing a prefix does not match, and every
 * miss (relative path, unregistered path, no checkouts, another user's checkout, a database
 * failure) returns null instead of throwing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';

const { mockRealpathSync } = vi.hoisted(() => ({
  mockRealpathSync: vi.fn(),
}));

vi.mock('node:fs', () => ({ realpathSync: mockRealpathSync }));

import { CheckoutPathResolutionService } from './checkout-path-resolution.service';

const PRIMARY = '/Users/matt/Development/openthrottle';
const WORKTREE = `${PRIMARY}/worktrees/feature`;
const USER = 'user-1';

type CheckoutOverrides = Partial<
  Pick<RepositoryCheckout, 'filesystemPath' | 'id' | 'kind' | 'repositoryId'>
>;

const checkout = (overrides: CheckoutOverrides = {}): RepositoryCheckout =>
  createMock<RepositoryCheckout>({
    filesystemPath: PRIMARY,
    id: 'checkout-primary',
    kind: 'primary',
    repositoryId: 'repo-1',
    userId: USER,
    ...overrides,
  });

/** Only checkouts owned by `userId` are ever returned, exactly like the real user-scoped query. */
const buildService = (
  checkouts: readonly RepositoryCheckout[],
): CheckoutPathResolutionService => {
  const checkoutsService = createMock<RepositoryCheckoutsService>({
    listByUserId: vi.fn(async (userId: string) =>
      checkouts.filter((entry) => entry.userId === userId),
    ),
  });

  return new CheckoutPathResolutionService(
    createMock<LoggerService>(),
    checkoutsService,
  );
};

describe('CheckoutPathResolutionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRealpathSync.mockImplementation((value: string) => value);
  });

  it('resolves a path that IS a registered checkout', async () => {
    const service = buildService([checkout()]);

    await expect(
      service.resolveCheckoutForPath({ path: PRIMARY, userId: USER }),
    ).resolves.toEqual({
      checkoutId: 'checkout-primary',
      repositoryId: 'repo-1',
    });
  });

  it('resolves a subdirectory of a registered checkout', async () => {
    const service = buildService([checkout()]);

    await expect(
      service.resolveCheckoutForPath({
        path: `${PRIMARY}/applications/openthrottle-server`,
        userId: USER,
      }),
    ).resolves.toEqual({
      checkoutId: 'checkout-primary',
      repositoryId: 'repo-1',
    });
  });

  it('resolves a symlinked path to the checkout it really points at', async () => {
    mockRealpathSync.mockImplementation((value: string) =>
      value === '/tmp/link' ? PRIMARY : value,
    );
    const service = buildService([checkout()]);

    await expect(
      service.resolveCheckoutForPath({ path: '/tmp/link', userId: USER }),
    ).resolves.toEqual({
      checkoutId: 'checkout-primary',
      repositoryId: 'repo-1',
    });
  });

  it('prefers the DEEPEST match when a registered worktree sits inside a registered primary', async () => {
    const service = buildService([
      checkout(),
      checkout({
        filesystemPath: WORKTREE,
        id: 'checkout-worktree',
        kind: 'worktree',
      }),
    ]);

    await expect(
      service.resolveCheckoutForPath({
        path: `${WORKTREE}/packages`,
        userId: USER,
      }),
    ).resolves.toEqual({
      checkoutId: 'checkout-worktree',
      repositoryId: 'repo-1',
    });
  });

  it('does not match a sibling checkout sharing a path prefix', async () => {
    const service = buildService([checkout()]);

    await expect(
      service.resolveCheckoutForPath({
        path: `${PRIMARY}-two/src`,
        userId: USER,
      }),
    ).resolves.toBeNull();
  });

  it('returns null for a relative path without listing checkouts', async () => {
    const service = buildService([checkout()]);

    await expect(
      service.resolveCheckoutForPath({ path: 'relative/path', userId: USER }),
    ).resolves.toBeNull();
  });

  it('returns null for an empty path', async () => {
    const service = buildService([checkout()]);

    await expect(
      service.resolveCheckoutForPath({ path: '   ', userId: USER }),
    ).resolves.toBeNull();
  });

  it('returns null for a path under no registered checkout', async () => {
    const service = buildService([checkout()]);

    await expect(
      service.resolveCheckoutForPath({ path: '/elsewhere', userId: USER }),
    ).resolves.toBeNull();
  });

  it('returns null when the user has no checkouts', async () => {
    const service = buildService([]);

    await expect(
      service.resolveCheckoutForPath({ path: PRIMARY, userId: USER }),
    ).resolves.toBeNull();
  });

  it('never matches a checkout belonging to a different user', async () => {
    const service = buildService([
      createMock<RepositoryCheckout>({
        filesystemPath: PRIMARY,
        id: 'checkout-other',
        kind: 'primary',
        repositoryId: 'repo-other',
        userId: 'user-2',
      }),
    ]);

    await expect(
      service.resolveCheckoutForPath({ path: PRIMARY, userId: USER }),
    ).resolves.toBeNull();
  });

  it('skips a checkout whose registered path is not absolute', async () => {
    const service = buildService([checkout({ filesystemPath: 'relative' })]);

    await expect(
      service.resolveCheckoutForPath({ path: PRIMARY, userId: USER }),
    ).resolves.toBeNull();
  });

  it('degrades to null when listing checkouts fails', async () => {
    const checkoutsService = createMock<RepositoryCheckoutsService>({
      listByUserId: vi.fn(async () => {
        throw new Error('database unavailable');
      }),
    });
    const service = new CheckoutPathResolutionService(
      createMock<LoggerService>(),
      checkoutsService,
    );

    await expect(
      service.resolveCheckoutForPath({ path: PRIMARY, userId: USER }),
    ).resolves.toBeNull();
  });

  it('degrades to null when realpath resolution throws', async () => {
    mockRealpathSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const service = buildService([checkout()]);

    await expect(
      service.resolveCheckoutForPath({ path: '/gone', userId: USER }),
    ).resolves.toBeNull();
  });
});
