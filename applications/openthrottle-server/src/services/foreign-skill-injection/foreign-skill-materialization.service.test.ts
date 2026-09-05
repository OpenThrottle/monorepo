/**
 * @description Unit tests for the on-demand "apply now" foreign-skill materializer: On materializes
 * each foreign checkout, Off tears it down, non-foreign checkouts are skipped, and failures soft-fail.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckoutsService } from '@openthrottle/nestjs-repositories';
import { type RepositoryCheckout } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForeignSkillMaterializationService } from './foreign-skill-materialization.service';

const { mockEnsureMaterialized, mockResolveForeign, mockTeardown } = vi.hoisted(
  () => ({
    mockEnsureMaterialized: vi.fn(),
    mockResolveForeign: vi.fn(),
    mockTeardown: vi.fn(),
  }),
);

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();
  return {
    ...actual,
    ensureMaterialized: mockEnsureMaterialized,
    resolveForeignWorkspaceContext: mockResolveForeign,
    teardown: mockTeardown,
  };
});

const USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const REPO_ID = 'rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr';
const PATH_A = '/Users/dev/foreign/repo-a';
const PATH_B = '/Users/dev/foreign/repo-b';

const checkoutAt = (filesystemPath: string): RepositoryCheckout =>
  createMock<RepositoryCheckout>({ filesystemPath, userId: USER_ID });

describe('ForeignSkillMaterializationService', () => {
  const mockFindByRepositoryIdForUser = vi.fn();
  const mockFindAllEnabled = vi.fn();
  let service: ForeignSkillMaterializationService;

  beforeEach(() => {
    mockFindByRepositoryIdForUser.mockReset();
    mockFindAllEnabled.mockReset();
    mockEnsureMaterialized.mockReset();
    mockEnsureMaterialized.mockReturnValue({ injectedNames: [], warnings: [] });
    mockTeardown.mockReset();
    mockResolveForeign.mockReset();
    mockResolveForeign.mockReturnValue({
      isForeign: true,
      openThrottleRoot: '/ot-root',
    });

    service = new ForeignSkillMaterializationService(
      createMock<LoggerService>(),
      createMock<RepositoryCheckoutsService>({
        findAllWithForeignSkillInjectionEnabled: mockFindAllEnabled,
        findByRepositoryIdForUser: mockFindByRepositoryIdForUser,
      }),
    );
  });

  it('materializes every foreign checkout when enabled', async () => {
    mockFindByRepositoryIdForUser.mockResolvedValue([
      checkoutAt(PATH_A),
      checkoutAt(PATH_B),
    ]);

    await service.applyForRepository(USER_ID, REPO_ID, true);

    expect(mockEnsureMaterialized).toHaveBeenCalledTimes(2);
    expect(mockEnsureMaterialized).toHaveBeenCalledWith(
      expect.objectContaining({ repoPath: PATH_A }),
    );
    expect(mockEnsureMaterialized).toHaveBeenCalledWith(
      expect.objectContaining({ repoPath: PATH_B }),
    );
    expect(mockTeardown).not.toHaveBeenCalled();
  });

  it('tears down every foreign checkout when disabled', async () => {
    mockFindByRepositoryIdForUser.mockResolvedValue([checkoutAt(PATH_A)]);

    await service.applyForRepository(USER_ID, REPO_ID, false);

    expect(mockTeardown).toHaveBeenCalledTimes(1);
    expect(mockTeardown).toHaveBeenCalledWith(
      expect.objectContaining({ repoPath: PATH_A }),
    );
    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
  });

  it('skips checkouts that are not foreign', async () => {
    mockResolveForeign.mockReturnValue({
      isForeign: false,
      openThrottleRoot: '/ot-root',
    });
    mockFindByRepositoryIdForUser.mockResolvedValue([checkoutAt(PATH_A)]);

    await service.applyForRepository(USER_ID, REPO_ID, true);

    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
    expect(mockTeardown).not.toHaveBeenCalled();
  });

  it('soft-fails a checkout whose materialize throws and continues', async () => {
    mockFindByRepositoryIdForUser.mockResolvedValue([
      checkoutAt(PATH_A),
      checkoutAt(PATH_B),
    ]);
    mockEnsureMaterialized.mockImplementationOnce(() => {
      throw new Error('disk exploded');
    });

    await expect(
      service.applyForRepository(USER_ID, REPO_ID, true),
    ).resolves.toBeUndefined();

    // The second checkout is still attempted after the first throws.
    expect(mockEnsureMaterialized).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when the user owns no checkout of the repository', async () => {
    mockFindByRepositoryIdForUser.mockResolvedValue([]);

    await service.applyForRepository(USER_ID, REPO_ID, true);

    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
    expect(mockTeardown).not.toHaveBeenCalled();
  });
});

describe('ForeignSkillMaterializationService.remateralizeEnabledCheckouts', () => {
  const mockFindAllEnabled = vi.fn();
  let service: ForeignSkillMaterializationService;

  beforeEach(() => {
    mockFindAllEnabled.mockReset();
    mockEnsureMaterialized.mockReset();
    mockEnsureMaterialized.mockReturnValue({ injectedNames: [], warnings: [] });
    mockTeardown.mockReset();
    mockResolveForeign.mockReset();
    mockResolveForeign.mockReturnValue({
      isForeign: true,
      openThrottleRoot: '/ot-root',
    });

    service = new ForeignSkillMaterializationService(
      createMock<LoggerService>(),
      createMock<RepositoryCheckoutsService>({
        findAllWithForeignSkillInjectionEnabled: mockFindAllEnabled,
      }),
    );
  });

  it('re-materializes every opted-in checkout and reports the count', async () => {
    mockFindAllEnabled.mockResolvedValue([
      checkoutAt(PATH_A),
      checkoutAt(PATH_B),
    ]);

    await expect(service.remateralizeEnabledCheckouts()).resolves.toBe(2);

    expect(mockEnsureMaterialized).toHaveBeenCalledTimes(2);
    expect(mockEnsureMaterialized).toHaveBeenCalledWith(
      expect.objectContaining({ repoPath: PATH_A }),
    );
    // Reconcile only ever builds up; it must never tear anything down.
    expect(mockTeardown).not.toHaveBeenCalled();
  });

  it('is a no-op when nothing is opted in', async () => {
    mockFindAllEnabled.mockResolvedValue([]);

    await expect(service.remateralizeEnabledCheckouts()).resolves.toBe(0);
    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
  });

  it('skips a checkout inside the OT monorepo, which already has its skills', async () => {
    mockFindAllEnabled.mockResolvedValue([checkoutAt(PATH_A)]);
    mockResolveForeign.mockReturnValue({ isForeign: false });

    await expect(service.remateralizeEnabledCheckouts()).resolves.toBe(1);
    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
  });

  it('keeps going when one checkout fails, so one bad path cannot block boot', async () => {
    mockFindAllEnabled.mockResolvedValue([
      checkoutAt(PATH_A),
      checkoutAt(PATH_B),
    ]);
    mockEnsureMaterialized.mockImplementationOnce(() => {
      throw new Error('ENOENT: the repo moved');
    });

    await expect(service.remateralizeEnabledCheckouts()).resolves.toBe(2);
    expect(mockEnsureMaterialized).toHaveBeenCalledTimes(2);
  });
});
