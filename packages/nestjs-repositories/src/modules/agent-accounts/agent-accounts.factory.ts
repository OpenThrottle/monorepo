/**
 * @description Fishery factory for the agent_accounts entity (test fixtures).
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { AGENT_ACCOUNT_CREDENTIAL_KINDS } from './agent-accounts.constants.ts';
import type { AgentAccount } from './agent-accounts.entity.ts';

export type AgentAccountFactoryData = Pick<
  AgentAccount,
  | 'credentialKind'
  | 'email'
  | 'externalAccountId'
  | 'firstSeenAt'
  | 'id'
  | 'lastSeenAt'
  | 'orgId'
  | 'orgName'
  | 'plan'
  | 'provider'
  | 'userId'
>;

export const agentAccountFactory = Factory.define<AgentAccountFactoryData>(
  () => {
    const email = faker.internet.email().toLowerCase();
    const orgId = faker.string.uuid();

    return {
      credentialKind: AGENT_ACCOUNT_CREDENTIAL_KINDS.SUBSCRIPTION,
      email,
      externalAccountId: `${orgId}:${email}`,
      firstSeenAt: faker.date.past(),
      id: faker.string.uuid(),
      lastSeenAt: faker.date.recent(),
      orgId,
      orgName: faker.company.name(),
      plan: faker.helpers.arrayElement(['max', 'pro', 'team']),
      provider: 'claude',
      userId: faker.string.uuid(),
    };
  },
);
