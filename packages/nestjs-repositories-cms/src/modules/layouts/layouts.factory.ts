/**
 * @description Fishery factory for {@link Layout}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { CMS_STATUS } from '../../config/config.constants.ts';
import type { Layout } from './layout.entity.ts';

/**
 * @description Column-only shape for building `layouts` test data.
 * @public
 */
export type LayoutFactoryData = Pick<
  Layout,
  | 'createdAt'
  | 'fragmentUuid'
  | 'isDeleted'
  | 'metadata'
  | 'name'
  | 'slug'
  | 'status'
  | 'tags'
  | 'updatedAt'
  | 'uuid'
>;

/**
 * @description Builds Layout-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const layoutsFactory = Factory.define<LayoutFactoryData>(() => ({
  createdAt: faker.date.past(),
  fragmentUuid: faker.string.uuid(),
  isDeleted: false,
  metadata: {},
  name: faker.lorem.words(3),
  slug: faker.helpers.slugify(faker.lorem.words(3)),
  status: CMS_STATUS.DRAFT,
  tags: [],
  updatedAt: faker.date.recent(),
  uuid: faker.string.uuid(),
}));
