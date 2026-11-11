/**
 * @description Fishery factory for {@link Survey}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Survey } from './survey.entity.ts';

/**
 * @description Column-only shape for building `surveys` test data.
 * @public
 */
export type SurveyFactoryData = Pick<
  Survey,
  'createdAt' | 'data' | 'isDeleted' | 'name' | 'updatedAt' | 'uuid'
>;

/**
 * @description Builds Survey-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const surveysFactory = Factory.define<SurveyFactoryData>(() => ({
  createdAt: faker.date.past(),
  data: {},
  isDeleted: false,
  name: faker.lorem.words(2),
  updatedAt: faker.date.recent(),
  uuid: faker.string.uuid(),
}));
