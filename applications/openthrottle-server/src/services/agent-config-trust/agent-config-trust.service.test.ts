/**
 * @description Unit tests for AgentConfigTrustService: the OpenThrottle checkout is always trusted,
 * a targeted checkout id or the owner's row for the directory decides the rest, and every gap
 * (no owner, no row, a failed read) fails closed to isolated.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsRepository,
} from '@openthrottle/nestjs-repositories-server';
import { createRepositoryCheckoutsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentConfigTrustService } from './agent-config-trust.service.ts';

const { mockResolveForeign } = vi.hoisted(() => ({
  mockResolveForeign: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();

  return { ...actual, resolveForeignWorkspaceContext: mockResolveForeign };
});

const CHECKOUT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DIRECTORY = '/repos/app';
const OWNER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const checkoutRow = (agentConfigTrusted: boolean): RepositoryCheckout => {
  return createMock<RepositoryCheckout>({
    agentConfigTrusted,
    filesystemPath: DIRECTORY,
    id: CHECKOUT_ID,
  });
};

const loadOwner = async (): Promise<string | null> => {
  return OWNER_ID;
};

const loadNoOwner = async (): Promise<string | null> => {
  return null;
};

describe('AgentConfigTrustService', () => {
  const checkouts = createRepositoryCheckoutsRepositoryMock();
  let service: AgentConfigTrustService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveForeign.mockReturnValue({
      isForeign: true,
      openThrottleRoot: '/ot-root',
    });
    checkouts.findByIdForUser.mockResolvedValue(checkoutRow(false));
    checkouts.findCheckoutById.mockResolvedValue(checkoutRow(false));
    checkouts.findByUserAndPath.mockResolvedValue(null);

    service = new AgentConfigTrustService(
      createMock<LoggerService>(),
      asMock<RepositoryCheckoutsRepository>(checkouts),
    );
  });

  describe('resolve', () => {
    it('trusts the OpenThrottle checkout without reading any row', async () => {
      mockResolveForeign.mockReturnValue({
        isForeign: false,
        openThrottleRoot: DIRECTORY,
      });

      const loadOwnerUserId = vi.fn(loadOwner);

      const trust = await service.resolve({
        checkoutId: CHECKOUT_ID,
        directory: DIRECTORY,
        loadOwnerUserId,
      });

      expect(trust).toEqual({
        posture: 'trusted',
        reason: 'openthrottle-checkout',
      });
      expect(loadOwnerUserId).not.toHaveBeenCalled();
      expect(checkouts.findByIdForUser).not.toHaveBeenCalled();
    });

    it('trusts a targeted checkout the owner trusted', async () => {
      checkouts.findByIdForUser.mockResolvedValue(checkoutRow(true));

      const trust = await service.resolve({
        checkoutId: CHECKOUT_ID,
        directory: DIRECTORY,
        loadOwnerUserId: loadOwner,
      });

      expect(trust).toEqual({ posture: 'trusted', reason: 'user-trusted' });
      expect(checkouts.findByIdForUser).toHaveBeenCalledWith(
        CHECKOUT_ID,
        OWNER_ID,
      );
    });

    it('isolates a targeted checkout the owner has not trusted', async () => {
      const trust = await service.resolve({
        checkoutId: CHECKOUT_ID,
        directory: DIRECTORY,
        loadOwnerUserId: loadOwner,
      });

      expect(trust).toEqual({ posture: 'isolated', reason: 'untrusted' });
    });

    it('reads a system row by id when there is no owner', async () => {
      checkouts.findCheckoutById.mockResolvedValue(checkoutRow(true));

      const trust = await service.resolve({
        checkoutId: CHECKOUT_ID,
        directory: DIRECTORY,
        loadOwnerUserId: loadNoOwner,
      });

      expect(trust.posture).toBe('trusted');
      expect(checkouts.findCheckoutById).toHaveBeenCalledWith(CHECKOUT_ID);
    });

    it("falls back to the owner's row for the directory when no checkout is targeted", async () => {
      checkouts.findByUserAndPath.mockResolvedValue(checkoutRow(true));

      const trust = await service.resolve({
        checkoutId: null,
        directory: DIRECTORY,
        loadOwnerUserId: loadOwner,
      });

      expect(trust.posture).toBe('trusted');
      expect(checkouts.findByUserAndPath).toHaveBeenCalledWith(
        OWNER_ID,
        DIRECTORY,
      );
    });

    it('isolates an unregistered directory', async () => {
      const trust = await service.resolve({
        checkoutId: null,
        directory: DIRECTORY,
        loadOwnerUserId: loadOwner,
      });

      expect(trust).toEqual({ posture: 'isolated', reason: 'unregistered' });
    });

    it('isolates a directory with neither a checkout nor an owner, without a lookup', async () => {
      const trust = await service.resolve({
        checkoutId: null,
        directory: DIRECTORY,
        loadOwnerUserId: loadNoOwner,
      });

      expect(trust).toEqual({ posture: 'isolated', reason: 'unregistered' });
      expect(checkouts.findByUserAndPath).not.toHaveBeenCalled();
    });

    it('fails closed when the lookup throws', async () => {
      checkouts.findByIdForUser.mockRejectedValue(new Error('db down'));

      const trust = await service.resolve({
        checkoutId: CHECKOUT_ID,
        directory: DIRECTORY,
        loadOwnerUserId: loadOwner,
      });

      expect(trust).toEqual({ posture: 'isolated', reason: 'unregistered' });
    });
  });

  describe('toRepoAgentConfig', () => {
    it('maps trusted to a trusted posture', () => {
      expect(
        service.toRepoAgentConfig({
          posture: 'trusted',
          reason: 'user-trusted',
        }),
      ).toEqual({ kind: 'trusted' });
    });

    it('maps isolated to an isolated posture with no MCP servers', () => {
      expect(
        service.toRepoAgentConfig({ posture: 'isolated', reason: 'untrusted' }),
      ).toEqual({ kind: 'isolated', mcpServers: {} });
    });
  });
});
