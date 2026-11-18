import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';

import type { WorkSessionSubject } from './work-session-subject.entity.ts';

/**
 * @description A `WorkSessionSubjectsRepository` mock: every inherited `BaseRepository`
 * method. The repository adds none.
 * @public
 */
export type WorkSessionSubjectsRepositoryMock = BaseRepositoryMock<
  WorkSessionSubject,
  CreateModelInput<WorkSessionSubject>
>;
