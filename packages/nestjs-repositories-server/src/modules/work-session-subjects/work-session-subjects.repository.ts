import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { WorkSessionSubject } from './work-session-subject.entity.ts';

/**
 * @description Data access for the openthrottle `work_session_subjects` table on the default
 * connection: the `BaseRepository` CRUD, with hard deletes since the ledger is append-only.
 * Attaching a subject is an insert; the session itself never mutates.
 * @public
 */
@Injectable()
export class WorkSessionSubjectsRepository extends BaseRepository<
  WorkSessionSubject,
  CreateModelInput<WorkSessionSubject>
> {
  protected readonly tableName = 'work_session_subjects';

  constructor(
    @InjectRepository(WorkSessionSubject)
    repository: Repository<WorkSessionSubject>,
  ) {
    super(repository);
  }
}
