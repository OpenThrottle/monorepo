/**
 * @description Fishery factory for `user_workspace_settings` rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { UserWorkspaceSettingsRow } from './user-workspace-settings.types.ts';

/**
 * @description Builds UserWorkspaceSettings-shaped plain objects: an empty profile by default.
 * Override any field via `.build({ ... })`.
 * @public
 */
export const userWorkspaceSettingsFactory =
  Factory.define<UserWorkspaceSettingsRow>(() => {
    return {
      contactDisplayName: null,
      contactEmail: null,
      createdAt: faker.date.past(),
      enabledEditors: [],
      updatedAt: faker.date.recent(),
      userId: faker.string.uuid(),
    };
  });
