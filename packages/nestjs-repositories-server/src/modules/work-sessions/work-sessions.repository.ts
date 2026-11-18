import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { WorkSession } from './work-session.entity.ts';
import type { CloseWorkSessionInput } from './work-sessions.types.ts';

/**
 * @description Data access for the openthrottle `work_sessions` table on the default
 * connection: the `BaseRepository` CRUD (hard deletes, since the ledger is append-only)
 * plus the idempotent close every session writer shares.
 * @public
 */
@Injectable()
export class WorkSessionsRepository extends BaseRepository<
  WorkSession,
  CreateModelInput<WorkSession>
> {
  protected readonly tableName = 'work_sessions';

  constructor(
    @InjectRepository(WorkSession)
    repository: Repository<WorkSession>,
  ) {
    super(repository);
  }

  /**
   * @description Closes a session idempotently and returns it, or `null` when no session has
   * that id. A session that is already closed keeps its `endedAt` and `closedBy`, so a late or
   * repeated close never reopens or overwrites one; a non-null `summary` is applied either way.
   */
  async close(
    id: string,
    input: CloseWorkSessionInput,
  ): Promise<WorkSession | null> {
    const session = await this.repository.findOne({ where: { id } });

    if (session == null) return null;

    if (session.endedAt == null) {
      session.endedAt = input.endedAt;
      session.closedBy = input.closedBy;
    }

    if (input.summary != null) session.summary = input.summary;

    return this.repository.save(session);
  }
}
