import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';

import { AGENT_ACCOUNT_CREDENTIAL_KINDS } from './agent-accounts.constants.ts';
import { AgentAccount } from './agent-accounts.entity.ts';
import { AgentAccountsService } from './agent-accounts.service.ts';

const input = {
  credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.SUBSCRIPTION,
  email: 'dev@example.com',
  externalAccountId: 'org-1:dev@example.com',
  orgId: 'org-1',
  orgName: 'Example',
  plan: 'team',
  provider: 'claude',
  userId: 'user-1',
};

const buildService = async (mockRepo: {
  createQueryBuilder?: ReturnType<typeof vi.fn>;
  find?: ReturnType<typeof vi.fn>;
}): Promise<AgentAccountsService> => {
  const app = await Test.createTestingModule({
    providers: [
      AgentAccountsService,
      { provide: getRepositoryToken(AgentAccount), useValue: mockRepo },
    ],
  }).compile();

  return app.get(AgentAccountsService);
};

const buildUpsertService = async (
  raw: unknown,
): Promise<{
  qb: Record<string, ReturnType<typeof vi.fn>>;
  service: AgentAccountsService;
}> => {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    execute: vi.fn().mockResolvedValue({ raw }),
    insert: vi.fn(),
    into: vi.fn(),
    onConflict: vi.fn(),
    returning: vi.fn(),
    values: vi.fn(),
  };
  for (const key of ['insert', 'into', 'onConflict', 'returning', 'values']) {
    qb[key]?.mockReturnValue(qb);
  }
  const service = await buildService({
    createQueryBuilder: vi.fn().mockReturnValue(qb),
  });

  return { qb, service };
};

describe('AgentAccountsService', () => {
  describe('upsertSeen', () => {
    describe('when the database returns the row id', () => {
      it('upserts on the natural key and returns the id', async () => {
        const { qb, service } = await buildUpsertService([{ id: 'account-1' }]);

        await expect(service.upsertSeen(input)).resolves.toBe('account-1');
        expect(qb.values).toHaveBeenCalledWith(input);
        expect(qb.onConflict).toHaveBeenCalledWith(
          expect.stringContaining('(user_id, provider, external_account_id)'),
        );
        expect(qb.onConflict).toHaveBeenCalledWith(
          expect.stringContaining('last_seen_at = NOW()'),
        );
        expect(qb.returning).toHaveBeenCalledWith('id');
      });

      it('keeps a previously reported field when the CLI stops reporting it', async () => {
        const { qb, service } = await buildUpsertService([{ id: 'account-1' }]);

        await service.upsertSeen({ ...input, email: null });

        expect(qb.onConflict).toHaveBeenCalledWith(
          expect.stringContaining(
            'email = COALESCE(EXCLUDED.email, agent_accounts.email)',
          ),
        );
      });
    });

    describe('when the database returns no id', () => {
      it.each([[[]], [null], [[{ id: 42 }]], [[{}]]])(
        'returns null for %j',
        async (raw) => {
          const { service } = await buildUpsertService(raw);

          await expect(service.upsertSeen(input)).resolves.toBeNull();
        },
      );
    });
  });

  describe('listByIds', () => {
    describe('when no ids are given', () => {
      it('returns an empty list without querying', async () => {
        const find = vi.fn();
        const service = await buildService({ find });

        await expect(service.listByIds('user-1', [])).resolves.toEqual([]);
        expect(find).not.toHaveBeenCalled();
      });
    });

    describe('when ids are given', () => {
      it('scopes the lookup to the user', async () => {
        const find = vi.fn().mockResolvedValue([]);
        const service = await buildService({ find });

        await service.listByIds('user-1', ['account-1']);

        expect(find).toHaveBeenCalledWith({
          where: expect.objectContaining({ userId: 'user-1' }),
        });
      });
    });
  });

  describe('listForUser', () => {
    it('lists the user accounts most recently used first', async () => {
      const find = vi.fn().mockResolvedValue([]);
      const service = await buildService({ find });

      await service.listForUser('user-1');

      expect(find).toHaveBeenCalledWith({
        order: { lastSeenAt: 'DESC' },
        where: { userId: 'user-1' },
      });
    });
  });
});
