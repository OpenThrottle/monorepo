/**
 * @description Fishery factory for {@link UserDisabledAgentCli}. Use in tests to build mock
 * disable rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { UserDisabledAgentCli } from './user-disabled-agent-cli.entity.ts';

/**
 * @description Column-only shape for building `user_disabled_agent_clis` test data.
 * @public
 */
export type UserDisabledAgentCliFactoryData = Pick<
  UserDisabledAgentCli,
  'driver' | 'createdAt' | 'id' | 'model' | 'userId'
>;

/**
 * @description Builds UserDisabledAgentCli-shaped plain objects: an agent-level (model null)
 * disable by default. Override any field via `.build({ ... })`.
 * @public
 */
export const userDisabledAgentClisFactory =
  Factory.define<UserDisabledAgentCliFactoryData>(() => ({
    createdAt: faker.date.past(),
    driver: faker.helpers.arrayElement(['claude', 'codex', 'cursor']),
    id: faker.string.uuid(),
    model: null,
    userId: faker.string.uuid(),
  }));
