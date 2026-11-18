import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AGENT_ACCOUNT_CREDENTIAL_KINDS } from './agent-accounts.constants.ts';
import { createAgentAccountsRepositoryMock } from './agent-accounts.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createAgentAccountsRepositoryMock', () => {
  it('starts as an empty table, so usage reads as unattributed', async () => {
    const repository = createAgentAccountsRepositoryMock();

    await expect(repository.listForUser(userId)).resolves.toEqual([]);
    await expect(repository.listByIds(userId, ['a'])).resolves.toEqual([]);
    await expect(
      repository.upsertSeen({
        credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.UNKNOWN,
        email: null,
        externalAccountId: 'x',
        orgId: null,
        orgName: null,
        plan: null,
        provider: 'claude',
        userId,
      }),
    ).resolves.toBeNull();
  });

  it('names the agent_accounts table in inherited not-found errors', async () => {
    const repository = createAgentAccountsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'agent_accounts record with ID "a" not found',
    );
  });
});
