import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { AgentAccount } from './agent-account.entity.ts';
import type { AGENT_ACCOUNT_CREDENTIAL_KINDS } from './agent-accounts.constants.ts';
import type { AgentAccountsRepository } from './agent-accounts.repository.ts';

/** @public */
export type AgentAccountCredentialKind =
  (typeof AGENT_ACCOUNT_CREDENTIAL_KINDS)[keyof typeof AGENT_ACCOUNT_CREDENTIAL_KINDS];

/**
 * Scalar/column fields of {@link AgentAccount} (no relations).
 * @public
 */
export type AgentAccountData = Pick<
  AgentAccount,
  | 'createdAt'
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

/**
 * @public
 * @description One sighting of an agent account, as a usage writer saw it. Upserting it creates
 * the account or refreshes its descriptive fields and `last_seen_at`.
 */
export interface UpsertAgentAccountInput {
  readonly credentialKind: AgentAccountCredentialKind;
  readonly email: string | null;
  readonly externalAccountId: string;
  readonly orgId: string | null;
  readonly orgName: string | null;
  readonly plan: string | null;
  readonly provider: string;
  readonly userId: string;
}

/**
 * @description An {@link AgentAccountsRepository} mock: every inherited `BaseRepository` method
 * plus the upsert and the user-scoped reads.
 * @public
 */
export interface AgentAccountsRepositoryMock extends BaseRepositoryMock<
  AgentAccount,
  CreateModelInput<AgentAccount>
> {
  readonly listByIds: Mock<AgentAccountsRepository['listByIds']>;
  readonly listForUser: Mock<AgentAccountsRepository['listForUser']>;
  readonly upsertSeen: Mock<AgentAccountsRepository['upsertSeen']>;
}
