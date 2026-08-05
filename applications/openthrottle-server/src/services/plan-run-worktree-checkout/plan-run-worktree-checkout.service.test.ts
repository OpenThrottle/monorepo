import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanRunsService,
  RepositoriesService,
  RepositoryCheckoutsService,
  type PlanRun,
  type Repository,
  type RepositoryCheckout,
} from '@openthrottle/nestjs-repositories';
import { RepositoryInspectionService } from '../../graphql/repository-inspection/repository-inspection.service';
import type { RepositoryInspectionSnapshot } from '../../graphql/repository-inspection/repository-inspection.snapshot';
import { PlanRunWorktreeCheckoutService } from './plan-run-worktree-checkout.service';

const PLAN_RUN_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const REPOSITORY_ID = '33333333-3333-4333-8333-333333333333';
const CHECKOUT_ID = '44444444-4444-4444-8444-444444444444';
const WORKTREE_PATH =
  '/Users/matt/.cursor/worktrees/openthrottle/auto-register';

const buildRun = (overrides: Partial<PlanRun> = {}): PlanRun =>
  createMock<PlanRun>({
    actorUserId: USER_ID,
    branch: 'main',
    bullmqJobId: 'job-1',
    cancelRequestedAt: null,
    cancelRequestedBy: null,
    checkoutId: null,
    createdAt: new Date('2026-08-02T00:00:00Z'),
    executionBackend: 'claude',
    hostname: null,
    id: PLAN_RUN_ID,
    lastHeartbeatAt: null,
    model: null,
    pid: null,
    planId: 'plan-1',
    queueName: 'plans',
    runConfigSnapshot: null,
    runKind: 'orchestrator',
    status: 'IN_PROGRESS',
    updatedAt: new Date('2026-08-02T00:00:00Z'),
    workerId: null,
    ...overrides,
  });

const buildSnapshot = (
  overrides: {
    readonly isLinkedWorktree?: boolean;
    readonly normalizedRemoteUrl?: string | null;
  } = {},
): RepositoryInspectionSnapshot => ({
  agentConfig: {
    agentsMd: false,
    claudeMd: false,
    cursorRules: false,
    mcpJson: false,
    skillsDir: false,
  },
  git: {
    currentBranch: 'main',
    defaultBranch: 'main',
    dirty: false,
    isLinkedWorktree: overrides.isLinkedWorktree ?? true,
    isRepo: true,
    linkedWorktrees: [],
    normalizedRemoteUrl:
      overrides.normalizedRemoteUrl === undefined
        ? 'https://github.com/openthrottle/monorepo'
        : overrides.normalizedRemoteUrl,
    remotes: [],
  },
  manifest: {
    checkoutId: null,
    present: false,
    repositoryId: null,
  },
  scannedAt: '2026-08-02T00:00:00.000Z',
  stack: {
    languages: [],
    nxWorkspace: false,
    packageManager: null,
    pnpmWorkspace: false,
    turbo: false,
  },
  warnings: [],
});

describe('PlanRunWorktreeCheckoutService', () => {
  const mockFindById = vi.fn();
  const mockSetCheckoutIdIfNull = vi.fn();
  const mockScan = vi.fn();
  const mockUpsertWorktreeCheckout = vi.fn();
  const mockFindRepositoryById = vi.fn();
  const mockFindByNormalizedRemoteUrl = vi.fn();
  const mockWarn = vi.fn();
  const mockDebug = vi.fn();

  let service: PlanRunWorktreeCheckoutService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new PlanRunWorktreeCheckoutService(
      createMock<RepositoryCheckoutsService>({
        upsertWorktreeCheckout: mockUpsertWorktreeCheckout,
      }),
      createMock<RepositoryInspectionService>({
        scan: mockScan,
      }),
      createMock<LoggerService>({
        debug: mockDebug,
        warn: mockWarn,
      }),
      createMock<PlanRunsService>({
        findById: mockFindById,
        setCheckoutIdIfNull: mockSetCheckoutIdIfNull,
      }),
      createMock<RepositoriesService>({
        findById: mockFindRepositoryById,
        findByNormalizedRemoteUrl: mockFindByNormalizedRemoteUrl,
      }),
    );
  });

  describe('when checkout_id is already set', () => {
    it('returns the existing run without scanning or upserting', async () => {
      const existing = buildRun({ checkoutId: CHECKOUT_ID });
      mockFindById.mockResolvedValueOnce(existing);

      const result = await service.register({
        filesystemPath: WORKTREE_PATH,
        planRunId: PLAN_RUN_ID,
        userId: USER_ID,
      });

      expect(result).toBe(existing);
      expect(mockScan).not.toHaveBeenCalled();
      expect(mockUpsertWorktreeCheckout).not.toHaveBeenCalled();
      expect(mockSetCheckoutIdIfNull).not.toHaveBeenCalled();
    });
  });

  describe('when the path is not a linked worktree', () => {
    it('soft no-ops and leaves checkout_id NULL', async () => {
      const run = buildRun();
      mockFindById.mockResolvedValueOnce(run);
      mockScan.mockResolvedValueOnce(
        buildSnapshot({ isLinkedWorktree: false }),
      );

      const result = await service.register({
        filesystemPath: WORKTREE_PATH,
        planRunId: PLAN_RUN_ID,
        userId: USER_ID,
      });

      expect(result).toBe(run);
      expect(result?.checkoutId).toBeNull();
      expect(mockUpsertWorktreeCheckout).not.toHaveBeenCalled();
      expect(mockSetCheckoutIdIfNull).not.toHaveBeenCalled();
    });
  });

  describe('when repositoryId cannot be resolved', () => {
    it('soft-fails and leaves checkout_id NULL', async () => {
      const run = buildRun({
        runConfigSnapshot: {
          ralph: { executionBackend: 'claude' },
          target: { mode: 'plan', taskId: '' },
          version: 1 as const,
          workspace: { workingDirectory: WORKTREE_PATH },
        },
      });
      mockFindById.mockResolvedValueOnce(run);
      mockScan.mockResolvedValueOnce(
        buildSnapshot({ normalizedRemoteUrl: null }),
      );

      const result = await service.register({
        filesystemPath: WORKTREE_PATH,
        planRunId: PLAN_RUN_ID,
        userId: USER_ID,
      });

      expect(result).toBe(run);
      expect(mockWarn).toHaveBeenCalled();
      expect(mockUpsertWorktreeCheckout).not.toHaveBeenCalled();
      expect(mockSetCheckoutIdIfNull).not.toHaveBeenCalled();
    });
  });

  describe('happy path', () => {
    it('upserts a worktree checkout from snapshot repositoryId and back-fills checkout_id', async () => {
      const run = buildRun({
        runConfigSnapshot: {
          ralph: { executionBackend: 'claude' },
          target: { mode: 'plan', taskId: '' },
          version: 1 as const,
          workspace: {
            repositoryId: REPOSITORY_ID,
            workingDirectory: WORKTREE_PATH,
          },
        },
      });
      const checkout = createMock<RepositoryCheckout>({
        displayName: 'auto-register',
        filesystemPath: WORKTREE_PATH,
        id: CHECKOUT_ID,
        repositoryId: REPOSITORY_ID,
        userId: USER_ID,
      });
      const updated = buildRun({ checkoutId: CHECKOUT_ID });

      mockFindById.mockResolvedValueOnce(run);
      mockScan.mockResolvedValueOnce(buildSnapshot());
      mockFindRepositoryById.mockResolvedValueOnce(
        createMock<Repository>({ id: REPOSITORY_ID }),
      );
      mockUpsertWorktreeCheckout.mockResolvedValueOnce(checkout);
      mockSetCheckoutIdIfNull.mockResolvedValueOnce(updated);

      const result = await service.register({
        filesystemPath: WORKTREE_PATH,
        planRunId: PLAN_RUN_ID,
        userId: USER_ID,
      });

      expect(mockUpsertWorktreeCheckout).toHaveBeenCalledWith(USER_ID, {
        displayName: 'auto-register',
        filesystemPath: WORKTREE_PATH,
        repositoryId: REPOSITORY_ID,
      });
      expect(mockSetCheckoutIdIfNull).toHaveBeenCalledWith(
        PLAN_RUN_ID,
        CHECKOUT_ID,
      );
      expect(mockFindByNormalizedRemoteUrl).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ checkoutId: CHECKOUT_ID }),
      );
    });

    it('falls back to git remote when snapshot repositoryId is missing', async () => {
      const run = buildRun();
      const checkout = createMock<RepositoryCheckout>({
        displayName: 'auto-register',
        filesystemPath: WORKTREE_PATH,
        id: CHECKOUT_ID,
        repositoryId: REPOSITORY_ID,
        userId: USER_ID,
      });
      const updated = buildRun({ checkoutId: CHECKOUT_ID });

      mockFindById.mockResolvedValueOnce(run);
      mockScan.mockResolvedValueOnce(buildSnapshot());
      mockFindByNormalizedRemoteUrl.mockResolvedValueOnce(
        createMock<Repository>({ id: REPOSITORY_ID }),
      );
      mockUpsertWorktreeCheckout.mockResolvedValueOnce(checkout);
      mockSetCheckoutIdIfNull.mockResolvedValueOnce(updated);

      const result = await service.register({
        filesystemPath: WORKTREE_PATH,
        planRunId: PLAN_RUN_ID,
        userId: USER_ID,
      });

      expect(mockFindByNormalizedRemoteUrl).toHaveBeenCalledWith(
        'https://github.com/openthrottle/monorepo',
      );
      expect(result?.checkoutId).toBe(CHECKOUT_ID);
    });
  });

  describe('when an unexpected error occurs', () => {
    it('soft-fails, logs, and returns the current run row', async () => {
      const run = buildRun();
      mockFindById.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockScan.mockRejectedValueOnce(new Error('disk exploded'));

      const result = await service.register({
        filesystemPath: WORKTREE_PATH,
        planRunId: PLAN_RUN_ID,
        userId: USER_ID,
      });

      expect(mockWarn).toHaveBeenCalled();
      expect(result).toBe(run);
      expect(mockUpsertWorktreeCheckout).not.toHaveBeenCalled();
    });
  });
});
