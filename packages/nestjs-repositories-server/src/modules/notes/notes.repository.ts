import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { Note } from './note.entity.ts';

/**
 * @description Data access for the openthrottle `notes` table on the default
 * connection: the `BaseRepository` CRUD, keyed on `id` and soft deleting
 * through `deleted_at`.
 * @public
 */
@Injectable()
export class NotesRepository extends BaseRepository<
  Note,
  CreateModelInput<Note>
> {
  protected readonly tableName = 'notes';

  constructor(
    @InjectRepository(Note)
    repository: Repository<Note>,
  ) {
    super(repository);
  }

  /**
   * @description Every live note, newest first. Unbounded on purpose: the
   * `notes` GraphQL query has no pagination arguments.
   */
  async findAllNewestFirst(): Promise<Note[]> {
    return this.findBy({ order: { createdAt: 'DESC' } });
  }
}
