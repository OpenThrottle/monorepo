/**
 * @description Fishery factory for {@link LibraryComponent}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { CMS_STATUS } from '../../config/config.constants.ts';
import type { LibraryComponent } from './library-component.entity.ts';

/**
 * @description Column-only shape for building `library_components` test data.
 * @public
 */
export type LibraryComponentFactoryData = Pick<
  LibraryComponent,
  | 'code'
  | 'createdAt'
  | 'isDeleted'
  | 'libraryUuid'
  | 'name'
  | 'propsSchema'
  | 'status'
  | 'typename'
  | 'updatedAt'
  | 'uuid'
>;

/**
 * @description Builds LibraryComponent-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const libraryComponentsFactory =
  Factory.define<LibraryComponentFactoryData>(() => ({
    code: 'export const Component = () => null;',
    createdAt: faker.date.past(),
    isDeleted: false,
    libraryUuid: faker.string.uuid(),
    name: faker.lorem.words(2),
    propsSchema: { type: 'object' },
    status: CMS_STATUS.DRAFT,
    typename: faker.word.noun(),
    updatedAt: faker.date.recent(),
    uuid: faker.string.uuid(),
  }));
