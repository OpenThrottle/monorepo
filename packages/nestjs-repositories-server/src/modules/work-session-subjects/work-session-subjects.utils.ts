import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';

import type { WorkSessionSubject } from './work-session-subject.entity.ts';
import type { WorkSessionSubjectsRepositoryMock } from './work-session-subjects.types.ts';

/**
 * @description Builds a {@link WorkSessionSubjectsRepositoryMock} that starts as an empty
 * `work_session_subjects` table (see `createBaseRepositoryMock`). Provide it in place of
 * `WorkSessionSubjectsRepository` and stub per test. Test-only: its base imports `vitest`.
 * @public
 */
export function createWorkSessionSubjectsRepositoryMock(): WorkSessionSubjectsRepositoryMock {
  return createBaseRepositoryMock<
    WorkSessionSubject,
    CreateModelInput<WorkSessionSubject>
  >('work_session_subjects');
}
