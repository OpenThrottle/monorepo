/**
 * @description Fishery factory for {@link WorkSession}. Use in tests to build mock
 * work-session rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { WorkSession } from './work-session.entity.ts';
import { WORK_SESSION_CLOSED_BY } from './work-sessions.constants.ts';

/**
 * @description Column-only shape for building `work_sessions` test data.
 * @public
 */
export type WorkSessionFactoryData = Pick<
  WorkSession,
  | 'actorServiceAccountId'
  | 'actorUserId'
  | 'closedBy'
  | 'conversationId'
  | 'createdAt'
  | 'endedAt'
  | 'externalRef'
  | 'id'
  | 'model'
  | 'onBehalfOfUserId'
  | 'onBehalfOfVerified'
  | 'planRunId'
  | 'startedAt'
  | 'summary'
  | 'toolName'
  | 'toolVersion'
>;

/**
 * @description Builds WorkSession-shaped plain objects. Defaults to a closed service-account
 * session (single-actor invariant satisfied); override `actorUserId` and null the service
 * account for a human session.
 * @public
 */
export const workSessionsFactory = Factory.define<WorkSessionFactoryData>(
  () => {
    const startedAt = faker.date.recent();

    return {
      actorServiceAccountId: faker.string.uuid(),
      actorUserId: null,
      closedBy: WORK_SESSION_CLOSED_BY.EXPLICIT,
      conversationId: null,
      createdAt: startedAt,
      endedAt: faker.date.soon({ refDate: startedAt }),
      externalRef: faker.string.alphanumeric(12),
      id: faker.string.uuid(),
      model: 'claude-fable-5',
      onBehalfOfUserId: null,
      onBehalfOfVerified: false,
      planRunId: null,
      startedAt,
      summary: null,
      toolName: 'plan-runner',
      toolVersion: null,
    };
  },
);
