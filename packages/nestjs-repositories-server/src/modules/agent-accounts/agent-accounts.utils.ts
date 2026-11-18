import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { AgentAccount } from './agent-account.entity.ts';
import type { AgentAccountsRepositoryMock } from './agent-accounts.types.ts';

/**
 * @description Builds an {@link AgentAccountsRepositoryMock} that starts as an empty
 * `agent_accounts` table (see `createBaseRepositoryMock`): the reads return no accounts and
 * `upsertSeen` returns null, so a usage row reads as unattributed. Provide it in place of
 * `AgentAccountsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createAgentAccountsRepositoryMock(): AgentAccountsRepositoryMock {
  return {
    ...createBaseRepositoryMock<AgentAccount, CreateModelInput<AgentAccount>>(
      'agent_accounts',
    ),
    listByIds: vi.fn(async () => {
      return [];
    }),
    listForUser: vi.fn(async () => {
      return [];
    }),
    upsertSeen: vi.fn(async () => {
      return null;
    }),
  };
}
