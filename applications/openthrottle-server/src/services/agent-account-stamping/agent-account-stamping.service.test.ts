import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AgentAccountsService } from '@openthrottle/nestjs-repositories';
import type { AgentAccountIdentity } from '@openthrottle/openthrottle-agentic-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_ACCOUNT_RESOLVER } from './agent-account-stamping.constants.ts';
import { AgentAccountStampingService } from './agent-account-stamping.service.ts';

const identified: AgentAccountIdentity = {
  credentialKind: 'subscription',
  email: 'dev@example.com',
  externalAccountId: 'org-1:dev@example.com',
  kind: 'identified',
  orgId: 'org-1',
  orgName: 'Example',
  plan: 'team',
  provider: 'claude',
};

const unattributed: AgentAccountIdentity = {
  kind: 'unattributed',
  provider: 'grok',
  reason: 'unsupported',
};

describe('AgentAccountStampingService', () => {
  let service: AgentAccountStampingService;
  let resolve: ReturnType<typeof vi.fn>;
  let upsertSeen: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resolve = vi.fn().mockResolvedValue(identified);
    upsertSeen = vi.fn().mockResolvedValue('account-1');

    const app = await Test.createTestingModule({
      providers: [
        AgentAccountStampingService,
        { provide: AGENT_ACCOUNT_RESOLVER, useValue: { resolve } },
        { provide: AgentAccountsService, useValue: { upsertSeen } },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = app.get(AgentAccountStampingService);
  });

  describe('stampForRun', () => {
    describe('when the account is identified', () => {
      it('resolves under the run env, upserts for the user and returns the id', async () => {
        const env = { HOME: '/home/dev' };

        await expect(
          service.stampForRun('user-1', 'claude', env),
        ).resolves.toBe('account-1');
        expect(resolve).toHaveBeenCalledWith('claude', { env });
        expect(upsertSeen).toHaveBeenCalledWith({
          credentialKind: 'subscription',
          email: 'dev@example.com',
          externalAccountId: 'org-1:dev@example.com',
          orgId: 'org-1',
          orgName: 'Example',
          plan: 'team',
          provider: 'claude',
          userId: 'user-1',
        });
      });
    });

    describe('when the account is unattributed', () => {
      it('returns null without upserting', async () => {
        resolve.mockResolvedValueOnce(unattributed);

        await expect(service.stampForRun('user-1', 'grok', {})).resolves.toBe(
          null,
        );
        expect(upsertSeen).not.toHaveBeenCalled();
      });
    });

    describe('when resolution throws', () => {
      it('returns null', async () => {
        resolve.mockRejectedValueOnce(new Error('spawn failed'));

        await expect(
          service.stampForRun('user-1', 'claude', {}),
        ).resolves.toBeNull();
      });
    });
  });

  describe('stampIdentity', () => {
    describe('when the upsert fails', () => {
      it('returns null instead of throwing', async () => {
        upsertSeen.mockRejectedValueOnce(new Error('db down'));

        await expect(
          service.stampIdentity('user-1', identified),
        ).resolves.toBeNull();
      });
    });
  });
});
