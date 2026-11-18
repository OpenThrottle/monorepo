import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { WorkArtifact } from './work-artifact.entity.ts';
import { WORK_LEDGER_PLAN_COMPLETENESS_SQL } from './work-artifacts.constants.ts';
import type { WorkLedgerPlanCompletenessRow } from './work-artifacts.types.ts';

/**
 * @description Data access for the openthrottle `work_artifacts` table on the default
 * connection: the `BaseRepository` CRUD (hard deletes, since the ledger is append-only) plus
 * the plan-completeness read over artifacts and their sessions' subjects.
 * @public
 */
@Injectable()
export class WorkArtifactsRepository extends BaseRepository<
  WorkArtifact,
  CreateModelInput<WorkArtifact>
> {
  protected readonly tableName = 'work_artifacts';

  constructor(
    @InjectRepository(WorkArtifact)
    repository: Repository<WorkArtifact>,
  ) {
    super(repository);
  }

  /**
   * @description Every plan the ledger links a git_commit to, with whether at least one of
   * them is verified landed. Ordered unrecorded first (see
   * {@link WORK_LEDGER_PLAN_COMPLETENESS_SQL}).
   */
  async listPlanCompleteness(): Promise<WorkLedgerPlanCompletenessRow[]> {
    return this.repository.manager.query(WORK_LEDGER_PLAN_COMPLETENESS_SQL);
  }
}
