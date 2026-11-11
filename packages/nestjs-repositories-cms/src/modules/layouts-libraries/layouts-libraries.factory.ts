/**
 * @description Fishery factory for {@link LayoutLibrary}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { LayoutLibrary } from './layout-library.entity.ts';

/**
 * @description Column-only shape for building `layouts_libraries` test data.
 * @public
 */
export type LayoutLibraryFactoryData = Pick<
  LayoutLibrary,
  'createdAt' | 'layoutUuid' | 'libraryUuid' | 'uuid'
>;

/**
 * @description Builds LayoutLibrary-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const layoutsLibrariesFactory = Factory.define<LayoutLibraryFactoryData>(
  () => ({
    createdAt: faker.date.past(),
    layoutUuid: faker.string.uuid(),
    libraryUuid: faker.string.uuid(),
    uuid: faker.string.uuid(),
  }),
);
