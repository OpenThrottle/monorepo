/**
 * @description Fishery factory for {@link WorkSessionSubject}. Use in tests to build mock
 * subject rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { WorkSessionSubject } from './work-session-subject.entity.ts';

/**
 * @description Column-only shape for building `work_session_subjects` test data.
 * @public
 */
export type WorkSessionSubjectFactoryData = Pick<
  WorkSessionSubject,
  'attachedAt' | 'createdAt' | 'id' | 'planId' | 'sessionId' | 'taskId'
>;

/**
 * @description Builds WorkSessionSubject-shaped plain objects: plan-level by default; set
 * `taskId` for a task-level subject.
 * @public
 */
export const workSessionSubjectsFactory =
  Factory.define<WorkSessionSubjectFactoryData>(() => {
    const attachedAt = faker.date.recent();

    return {
      attachedAt,
      createdAt: attachedAt,
      id: faker.string.uuid(),
      planId: faker.string.uuid(),
      sessionId: faker.string.uuid(),
      taskId: null,
    };
  });
