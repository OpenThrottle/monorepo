/**
 * @description Unit tests for the shared run-start workspace setup: the two skip flags the OT Loop
 * runner sets (no MCP preflight, no foreign-skill injection) and the worktree handoff both runners
 * share. Ralph's own suite covers the unskipped path end to end.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanOutputStreamService,
  PlanRun,
  PlanRunsService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorktreeSkillOverlayService } from '../foreign-skill-injection/worktree-skill-overlay/worktree-skill-overlay.service.ts';
import type { PlanRunWorkspacePreflightService } from '../plan-run-workspace-preflight/plan-run-workspace-preflight.service.ts';
import type { PlanRunWorktreeCheckoutService } from '../plan-run-worktree-checkout/plan-run-worktree-checkout.service.ts';
import type { PlanRunWorktreeProvisionService } from '../plan-run-worktree-provision/plan-run-worktree-provision.service.ts';
import { PlanRunWorkspaceService } from './plan-run-workspace.service.ts';

const { mockEnsureMaterialized, mockResolveForeign } = vi.hoisted(() => ({
  mockEnsureMaterialized: vi.fn(),
  mockResolveForeign: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();

  return {
    ...actual,
    ensureMaterialized: mockEnsureMaterialized,
    resolveForeignWorkspaceContext: mockResolveForeign,
  };
});

vi.mock('@tools/workflows', () => ({
  applyWorkflowRalphOtRootFromConfig: vi.fn(),
  loadWorkflowRalphConfig: vi.fn(() => ({ model: 'from-config' })),
}));

const PLAN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const WORKTREE = `/worktrees/plan-aaaaaaaa`;
const BASE = `/repos/app`;

describe('PlanRunWorkspaceService', () => {
  const mockCheck = vi.fn((): readonly string[] => ['no MCP config']);
  const mockProvision = vi.fn(async () => WORKTREE);
  const mockRegister = vi.fn().mockResolvedValue(null);
  const mockFindByUserAndPath = vi.fn();
  const mockOnProvisioned = vi.fn();
  let service: PlanRunWorkspaceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheck.mockReturnValue(['no MCP config']);
    mockProvision.mockResolvedValue(WORKTREE);
    mockFindByUserAndPath.mockResolvedValue({
      foreignSkillInjectionEnabled: true,
    });
    mockEnsureMaterialized.mockReturnValue({
      injectedNames: ['ot-plans'],
      warnings: [],
    });
    mockResolveForeign.mockReturnValue({
      isForeign: true,
      openThrottleRoot: '/ot-root',
    });

    const run = createMock<PlanRun>({
      actorUserId: USER_ID,
      id: 'run-1',
      runConfigSnapshot: null,
    });
    const planRuns = createMock<PlanRunsService>({
      findByQueueNameAndBullmqJobId: vi.fn().mockResolvedValue(run),
    });

    service = new PlanRunWorkspaceService(
      createMock<LoggerService>(),
      createMock<PlanOutputStreamService>({
        getRepository: () =>
          asMock<ReturnType<PlanOutputStreamService['getRepository']>>({
            create: (entity: unknown) => entity,
            save: vi.fn(),
          }),
      }),
      planRuns,
      createMock<PlanRunWorktreeCheckoutService>({ register: mockRegister }),
      createMock<PlanRunWorkspacePreflightService>({ check: mockCheck }),
      createMock<PlanRunWorktreeProvisionService>({ provision: mockProvision }),
      createMock<RepositoryCheckoutsService>({
        findByUserAndPath: mockFindByUserAndPath,
      }),
      createMock<WorktreeSkillOverlayService>({
        ensureForBaseCheckout: vi
          .fn()
          .mockResolvedValue({ baseCheckoutPath: BASE, status: 'not-foreign' }),
      }),
    );
  });

  const prepare = (flags: {
    readonly skipMcpPreflight: boolean;
    readonly skipSkillInjection: boolean;
  }): ReturnType<PlanRunWorkspaceService['prepare']> => {
    return service.prepare({
      correlation: {
        correlationId: 'job-1',
        queueJobId: 'job-1',
        queueName: 'Plans',
      },
      jobData: {
        executionBackend: 'claude',
        planId: PLAN_ID,
        ralph: { worktree: 'plan-aaaaaaaa' },
        runKind: 'orchestrator',
        workingDirectory: BASE,
      },
      onWorktreeProvisioned: mockOnProvisioned,
      ...flags,
    });
  };

  it('provisions the worktree, reports it, registers it and returns it as the working directory', async () => {
    const prepared = await prepare({
      skipMcpPreflight: false,
      skipSkillInjection: false,
    });

    expect(mockProvision).toHaveBeenCalledWith({
      baseCheckoutPath: BASE,
      worktreeName: 'plan-aaaaaaaa',
    });
    expect(mockOnProvisioned).toHaveBeenCalledWith({
      baseCheckoutPath: BASE,
      worktreePath: WORKTREE,
    });
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ filesystemPath: WORKTREE, userId: USER_ID }),
    );
    expect(prepared.workingDirectory).toBe(WORKTREE);
    expect(prepared.config).toMatchObject({ model: 'from-config' });
    expect(prepared.run?.id).toBe('run-1');
  });

  it('preflights MCP and injects foreign skills when neither is skipped', async () => {
    const prepared = await prepare({
      skipMcpPreflight: false,
      skipSkillInjection: false,
    });

    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(mockEnsureMaterialized).toHaveBeenCalledTimes(1);
    expect(prepared.injectedSkillNames).toEqual(['ot-plans']);
  });

  it('skips the MCP preflight when asked (OT Loop)', async () => {
    await prepare({ skipMcpPreflight: true, skipSkillInjection: false });

    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('skips foreign-skill injection when asked (OT Loop), without even looking up the checkout', async () => {
    const prepared = await prepare({
      skipMcpPreflight: false,
      skipSkillInjection: true,
    });

    expect(mockFindByUserAndPath).not.toHaveBeenCalled();
    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
    expect(prepared.injectedSkillNames).toEqual([]);
  });
});
