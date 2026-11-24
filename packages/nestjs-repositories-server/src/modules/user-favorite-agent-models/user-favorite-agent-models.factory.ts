/**
 * @description Fishery factory for {@link UserFavoriteAgentModel}. Use in tests to build mock
 * favorite rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { UserFavoriteAgentModel } from './user-favorite-agent-model.entity.ts';

/**
 * @description Column-only shape for building `user_favorite_agent_models` test data.
 * @public
 */
export type UserFavoriteAgentModelFactoryData = Pick<
  UserFavoriteAgentModel,
  'driver' | 'createdAt' | 'id' | 'model' | 'userId'
>;

/**
 * @description Builds UserFavoriteAgentModel-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const userFavoriteAgentModelsFactory =
  Factory.define<UserFavoriteAgentModelFactoryData>(() => ({
    createdAt: faker.date.past(),
    driver: faker.helpers.arrayElement(['claude', 'codex', 'cursor']),
    id: faker.string.uuid(),
    model: faker.helpers.arrayElement(['opus', 'sonnet', 'gpt-5']),
    userId: faker.string.uuid(),
  }));
