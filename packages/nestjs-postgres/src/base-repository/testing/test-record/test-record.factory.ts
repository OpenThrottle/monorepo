import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { CreateModelInput } from '../../../base-model/base-model.types.ts';
import type { TestRecord } from './test-record.entity.ts';

/**
 * @description Fishery factory for the create input of {@link TestRecord}.
 */
export const testRecordInputFactory = Factory.define<
  CreateModelInput<TestRecord>
>(() => {
  return {
    note: faker.lorem.sentence(),
    ownerId: faker.string.uuid(),
    quantity: faker.number.int({ max: 1_000, min: 1 }),
  };
});

/**
 * @description Fishery factory for a persisted {@link TestRecord}.
 */
export const testRecordFactory = Factory.define<TestRecord>(() => {
  const createdAt = faker.date.past();

  return {
    createdAt,
    deletedAt: null,
    id: faker.string.uuid(),
    note: faker.lorem.sentence(),
    ownerId: faker.string.uuid(),
    quantity: faker.number.int({ max: 1_000, min: 1 }),
    updatedAt: createdAt,
  };
});
