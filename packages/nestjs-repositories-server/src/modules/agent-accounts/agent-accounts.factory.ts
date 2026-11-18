/**
 * @description Fishery factory for `agent_accounts` rows. Use in tests to build mock accounts.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { AGENT_ACCOUNT_CREDENTIAL_KINDS } from './agent-accounts.constants.ts';
import type { AgentAccountData } from './agent-accounts.types.ts';

/**
 * @description Builds AgentAccount-shaped plain objects: a Claude subscription login by
 * default. Override any field via `.build({ ... })`.
 * @public
 */
export const agentAccountsFactory = Factory.define<AgentAccountData>(() => {
  const email = faker.internet.email().toLowerCase();
  const orgId = faker.string.uuid();
  const firstSeenAt = faker.date.past();

  return {
    createdAt: firstSeenAt,
    credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.SUBSCRIPTION,
    email,
    externalAccountId: `${orgId}:${email}`,
    firstSeenAt,
    id: faker.string.uuid(),
    lastSeenAt: faker.date.recent(),
    orgId,
    orgName: faker.company.name(),
    plan: faker.helpers.arrayElement(['max', 'pro', 'team']),
    provider: 'claude',
    userId: faker.string.uuid(),
  };
});
