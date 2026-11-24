import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { UserDisabledAgentCli } from './user-disabled-agent-cli.entity.ts';
import type { UserDisabledAgentClisRepository } from './user-disabled-agent-clis.repository.ts';

/**
 * Scalar/column fields of {@link UserDisabledAgentCli} (no relations).
 * @public
 */
export type UserDisabledAgentCliData = Pick<
  UserDisabledAgentCli,
  'driver' | 'createdAt' | 'id' | 'model' | 'userId'
>;

/**
 * @description A {@link UserDisabledAgentClisRepository} mock: every inherited
 * `BaseRepository` method plus the enablement ones.
 * @public
 */
export interface UserDisabledAgentClisRepositoryMock extends BaseRepositoryMock<
  UserDisabledAgentCli,
  CreateModelInput<UserDisabledAgentCli>
> {
  readonly getDisabledDrivers: Mock<
    UserDisabledAgentClisRepository['getDisabledDrivers']
  >;
  readonly getDisabledModels: Mock<
    UserDisabledAgentClisRepository['getDisabledModels']
  >;
  readonly isEnabled: Mock<UserDisabledAgentClisRepository['isEnabled']>;
  readonly isModelEnabled: Mock<
    UserDisabledAgentClisRepository['isModelEnabled']
  >;
  readonly setEnabled: Mock<UserDisabledAgentClisRepository['setEnabled']>;
  readonly setModelEnabled: Mock<
    UserDisabledAgentClisRepository['setModelEnabled']
  >;
  readonly setModelsEnabled: Mock<
    UserDisabledAgentClisRepository['setModelsEnabled']
  >;
}
