/**
 * @description Unit tests for the shared run-start workspace setup: the two skip flags the OT Loop
 * runner sets (no MCP preflight, no foreign-skill injection) and the worktree handoff both runners
 * share. The orchestrator suite covers the unskipped path end to end.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckoutsRepository } from '@openthrottle/nestjs-repositories-server';
import type {
  PlanRun,
  PlanRunsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { PlanOutputStreamRepository } from '@openthrottle/nestjs-repositories-server';
import { createRepositoryCheckoutsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlanOutputStreamRepositoryMock,
  createPlanRunsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { getDriver } from '@openthrottle/openthrottle-drivers';
import { UnrecoverableError } from 'bullmq';
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

vi.mock('@openthrottle/openthrottle-agentic-loop', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-loop')
    >();

  return {
    ...actual,
    applyPlanRunOtRootFromConfig: vi.fn(),
    loadPlanRunConfig: vi.fn(() => ({ model: 'from-config' })),
  };
});

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
  const planOutputStream = createPlanOutputStreamRepositoryMock();
  let service: PlanRunWorkspaceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheck.mockReturnValue(['no MCP config']);
    mockProvision.mockResolvedValue(WORKTREE);
    mockFindByUserAndPath.mockResolvedValue({
      agentConfigTrusted: true,
      filesystemPath: BASE,
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
    const planRunsRepository = createPlanRunsRepositoryMock();
    planRunsRepository.findByQueueNameAndBullmqJobId.mockResolvedValue(run);

    service = new PlanRunWorkspaceService(
      createMock<LoggerService>(),
      asMock<PlanOutputStreamRepository>(planOutputStream),
      createMock<PlanRunsRepository>(planRunsRepository),
      createMock<PlanRunWorktreeCheckoutService>({ register: mockRegister }),
      createMock<PlanRunWorkspacePreflightService>({ check: mockCheck }),
      createMock<PlanRunWorktreeProvisionService>({ provision: mockProvision }),
      asMock<RepositoryCheckoutsRepository>({
        ...createRepositoryCheckoutsRepositoryMock(),
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
        driver: 'claude',
        planId: PLAN_ID,
        runKind: 'orchestrator',
        tuning: { worktreeName: 'plan-aaaaaaaa' },
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

    expect(mockFindByUserAndPath).not.toHaveBeenCalledWith(USER_ID, WORKTREE);
    expect(mockEnsureMaterialized).not.toHaveBeenCalled();
    expect(prepared.injectedSkillNames).toEqual([]);
  });

  describe('agent-config trust', () => {
    it('reads trust from the base checkout, not the provisioned worktree', async () => {
      await prepare({ skipMcpPreflight: false, skipSkillInjection: true });

      expect(mockFindByUserAndPath).toHaveBeenCalledWith(USER_ID, BASE);
    });

    it('runs a trusted foreign checkout as before, with its MCP preflight', async () => {
      const prepared = await prepare({
        skipMcpPreflight: false,
        skipSkillInjection: true,
      });

      expect(prepared.agentConfigTrust).toEqual({
        posture: 'trusted',
        reason: 'user-trusted',
      });
      expect(mockCheck).toHaveBeenCalledTimes(1);
    });

    it('isolates an untrusted foreign checkout, skips its MCP preflight and says so', async () => {
      mockFindByUserAndPath.mockResolvedValue({
        agentConfigTrusted: false,
        filesystemPath: BASE,
        foreignSkillInjectionEnabled: false,
      });

      const prepared = await prepare({
        skipMcpPreflight: false,
        skipSkillInjection: true,
      });

      expect(prepared.agentConfigTrust).toEqual({
        posture: 'isolated',
        reason: 'untrusted',
      });
      expect(mockCheck).not.toHaveBeenCalled();
      expect(planOutputStream.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Untrusted checkout'),
          planId: PLAN_ID,
        }),
      );
    });

    it('fails closed when the checkout lookup throws', async () => {
      mockFindByUserAndPath.mockRejectedValue(new Error('db down'));

      const prepared = await prepare({
        skipMcpPreflight: true,
        skipSkillInjection: true,
      });

      expect(prepared.agentConfigTrust.posture).toBe('isolated');
    });
  });

  describe('buildRepoAgentConfig', () => {
    it('is trusted for a trusted run', () => {
      expect(
        service.buildRepoAgentConfig({
          posture: 'trusted',
          reason: 'user-trusted',
        }),
      ).toEqual({ kind: 'trusted' });
    });

    it('is isolated with no MCP servers for an untrusted run', () => {
      expect(
        service.buildRepoAgentConfig({
          posture: 'isolated',
          reason: 'untrusted',
        }),
      ).toEqual({ kind: 'isolated', mcpServers: {} });
    });
  });

  describe('refuseUnlessDriverHonoursPosture', () => {
    it('lets claude run an isolated posture', async () => {
      await expect(
        service.refuseUnlessDriverHonoursPosture({
          driver: getDriver('claude'),
          planId: PLAN_ID,
          repoAgentConfig: { kind: 'isolated', mcpServers: {} },
        }),
      ).resolves.toBeUndefined();
    });

    it('refuses cursor on an isolated posture and says why in plan output', async () => {
      await expect(
        service.refuseUnlessDriverHonoursPosture({
          driver: getDriver('cursor'),
          planId: PLAN_ID,
          repoAgentConfig: { kind: 'isolated', mcpServers: {} },
        }),
      ).rejects.toBeInstanceOf(UnrecoverableError);
      expect(planOutputStream.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Run refused'),
        }),
      );
    });

    it('lets any driver run a trusted posture', async () => {
      await expect(
        service.refuseUnlessDriverHonoursPosture({
          driver: getDriver('cursor'),
          planId: PLAN_ID,
          repoAgentConfig: { kind: 'trusted' },
        }),
      ).resolves.toBeUndefined();
    });
  });
});
