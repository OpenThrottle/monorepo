import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentAccount } from './agent-account.entity.ts';
import { AGENT_ACCOUNT_CREDENTIAL_KINDS } from './agent-accounts.constants.ts';
import { agentAccountsFactory } from './agent-accounts.factory.ts';
import { AgentAccountsRepository } from './agent-accounts.repository.ts';

const userId = '11111111-1111-4111-8111-111111111111';

const input = {
  credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.SUBSCRIPTION,
  email: 'dev@example.com',
  externalAccountId: 'org-1:dev@example.com',
  orgId: 'org-1',
  orgName: 'Example',
  plan: 'team',
  provider: 'claude',
  userId,
};

describe('AgentAccountsRepository', () => {
  const find = vi.fn();
  const queryBuilder = {
    execute: vi.fn(),
    insert: vi.fn(),
    into: vi.fn(),
    onConflict: vi.fn(),
    returning: vi.fn(),
    values: vi.fn(),
  };

  let repository: AgentAccountsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    queryBuilder.execute.mockResolvedValue({ raw: [{ id: 'account-1' }] });
    queryBuilder.insert.mockReturnValue(queryBuilder);
    queryBuilder.into.mockReturnValue(queryBuilder);
    queryBuilder.onConflict.mockReturnValue(queryBuilder);
    queryBuilder.returning.mockReturnValue(queryBuilder);
    queryBuilder.values.mockReturnValue(queryBuilder);

    const app = await Test.createTestingModule({
      providers: [
        AgentAccountsRepository,
        {
          provide: getRepositoryToken(AgentAccount),
          useValue: createMock<Repository<AgentAccount>>({
            createQueryBuilder: vi.fn(() => {
              return queryBuilder;
            }),
            find,
            target: AgentAccount,
          }),
        },
      ],
    }).compile();

    repository = app.get(AgentAccountsRepository);
  });

  describe('upsertSeen', () => {
    describe('when the database returns the row id', () => {
      it('upserts on the natural key and returns the id', async () => {
        await expect(repository.upsertSeen(input)).resolves.toBe('account-1');
        expect(queryBuilder.values).toHaveBeenCalledWith(input);
        expect(queryBuilder.onConflict).toHaveBeenCalledWith(
          expect.stringContaining('(user_id, provider, external_account_id)'),
        );
        expect(queryBuilder.onConflict).toHaveBeenCalledWith(
          expect.stringContaining('last_seen_at = NOW()'),
        );
        expect(queryBuilder.returning).toHaveBeenCalledWith('id');
      });

      it('keeps a previously reported field when the CLI stops reporting it', async () => {
        await repository.upsertSeen({ ...input, email: null });

        expect(queryBuilder.onConflict).toHaveBeenCalledWith(
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
          queryBuilder.execute.mockResolvedValue({ raw });

          await expect(repository.upsertSeen(input)).resolves.toBeNull();
        },
      );
    });
  });

  describe('listByIds', () => {
    describe('when no ids are given', () => {
      it('returns an empty list without querying', async () => {
        await expect(repository.listByIds(userId, [])).resolves.toEqual([]);
        expect(find).not.toHaveBeenCalled();
      });
    });

    describe('when ids are given', () => {
      it('scopes the lookup to the user', async () => {
        const accounts = agentAccountsFactory.buildList(1, { userId });
        find.mockResolvedValue(accounts);

        await expect(
          repository.listByIds(userId, ['account-1']),
        ).resolves.toEqual(accounts);
        expect(find).toHaveBeenCalledWith({
          where: { id: In(['account-1']), userId },
        });
      });
    });
  });

  describe('listForUser', () => {
    it('lists the user accounts most recently used first', async () => {
      await repository.listForUser(userId);

      expect(find).toHaveBeenCalledWith({
        order: { lastSeenAt: 'DESC' },
        where: { userId },
      });
    });
  });
});
