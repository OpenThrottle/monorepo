/**
 * @description Fishery factory for {@link FragmentChild}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { FragmentChild } from './fragment-child.entity.ts';

/**
 * @description Column-only shape for building `fragments_children` test data.
 * @public
 */
export type FragmentChildFactoryData = Pick<
  FragmentChild,
  'childrenUuid' | 'createdAt' | 'fragmentUuid' | 'sortOrder'
>;

/**
 * @description Builds FragmentChild-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const fragmentsChildrenFactory =
  Factory.define<FragmentChildFactoryData>(() => ({
    childrenUuid: faker.string.uuid(),
    createdAt: faker.date.past(),
    fragmentUuid: faker.string.uuid(),
    sortOrder: faker.number.int({ max: 20, min: 0 }),
  }));
