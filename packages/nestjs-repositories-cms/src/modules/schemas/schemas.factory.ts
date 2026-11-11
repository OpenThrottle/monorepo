/**
 * @description Fishery factory for {@link Schema}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { CMS_STATUS } from '../../config/config.constants.ts';
import type { Schema } from './schema.entity.ts';

/**
 * @description Column-only shape for building `schemas` test data.
 * @public
 */
export type SchemaFactoryData = Pick<
  Schema,
  | 'createdAt'
  | 'isDeleted'
  | 'jsonSchema'
  | 'status'
  | 'typename'
  | 'updatedAt'
  | 'uuid'
  | 'version'
>;

/**
 * @description Builds Schema-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const schemasFactory = Factory.define<SchemaFactoryData>(() => ({
  createdAt: faker.date.past(),
  isDeleted: false,
  jsonSchema: { type: 'object' },
  status: CMS_STATUS.DRAFT,
  typename: faker.word.noun(),
  updatedAt: faker.date.recent(),
  uuid: faker.string.uuid(),
  version: faker.system.semver(),
}));
