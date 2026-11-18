import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { WorkSession } from './work-session.entity.ts';
import type { WORK_SESSION_CLOSED_BY } from './work-sessions.constants.ts';
import type { WorkSessionsRepository } from './work-sessions.repository.ts';

/**
 * @description One of the ways a work session can be closed.
 * @public
 */
export type WorkSessionClosedBy =
  (typeof WORK_SESSION_CLOSED_BY)[keyof typeof WORK_SESSION_CLOSED_BY];

/**
 * @description How {@link WorkSessionsRepository.close} closes a session. `closedBy` and
 * `endedAt` apply only to a session that is still open; a non-null `summary` always applies.
 * @public
 */
export interface CloseWorkSessionInput {
  readonly closedBy: WorkSessionClosedBy;
  readonly endedAt: Date;
  readonly summary: string | null;
}

/**
 * @description A {@link WorkSessionsRepository} mock: every inherited `BaseRepository`
 * method plus the work-sessions ones.
 * @public
 */
export interface WorkSessionsRepositoryMock extends BaseRepositoryMock<
  WorkSession,
  CreateModelInput<WorkSession>
> {
  readonly close: Mock<WorkSessionsRepository['close']>;
}
