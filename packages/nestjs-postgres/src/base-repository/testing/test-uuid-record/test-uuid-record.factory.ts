import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { CreateModelInput } from '../../../base-model/base-model.types.ts';
import type { TestUuidRecord } from './test-uuid-record.entity.ts';

/**
 * @description Fishery factory for the create input of {@link TestUuidRecord}.
 */
export const testUuidRecordInputFactory = Factory.define<
  CreateModelInput<TestUuidRecord>
>(() => {
  return {
    note: faker.lorem.sentence(),
    quantity: faker.number.int({ max: 1_000, min: 1 }),
  };
});

/**
 * @description Fishery factory for a persisted {@link TestUuidRecord}.
 */
export const testUuidRecordFactory = Factory.define<TestUuidRecord>(() => {
  const createdAt = faker.date.past();

  return {
    createdAt,
    isDeleted: false,
    note: faker.lorem.sentence(),
    quantity: faker.number.int({ max: 1_000, min: 1 }),
    updatedAt: createdAt,
    uuid: faker.string.uuid(),
  };
});
