import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { CreateModelInput } from '../../../base-model/base-model.types.ts';
import type { TestHardDeleteRecord } from './test-hard-delete-record.entity.ts';

/**
 * @description Fishery factory for the create input of {@link TestHardDeleteRecord}.
 */
export const testHardDeleteRecordInputFactory = Factory.define<
  CreateModelInput<TestHardDeleteRecord>
>(() => {
  return {
    note: faker.lorem.sentence(),
    quantity: faker.number.int({ max: 1_000, min: 1 }),
  };
});

/**
 * @description Fishery factory for a persisted {@link TestHardDeleteRecord}.
 */
export const testHardDeleteRecordFactory = Factory.define<TestHardDeleteRecord>(
  () => {
    const createdAt = faker.date.past();

    return {
      createdAt,
      id: faker.string.uuid(),
      note: faker.lorem.sentence(),
      quantity: faker.number.int({ max: 1_000, min: 1 }),
      updatedAt: createdAt,
    };
  },
);
