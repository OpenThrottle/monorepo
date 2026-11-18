/**
 * @description Fishery factory for `user_preferences` rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { UserPreferencesRow } from './user-preferences.types.ts';

/**
 * @description Builds UserPreferences-shaped plain objects: every preference NULL (system
 * default) by default. Override any field via `.build({ ... })`.
 * @public
 */
export const userPreferencesFactory = Factory.define<UserPreferencesRow>(() => {
  return {
    createdAt: faker.date.past(),
    defaultAgentBackend: null,
    defaultAgentEffort: null,
    defaultAgentModel: null,
    defaultEditor: null,
    updatedAt: faker.date.recent(),
    userId: faker.string.uuid(),
  };
});
