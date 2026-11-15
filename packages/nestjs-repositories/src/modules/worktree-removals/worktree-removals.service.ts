/**
 * @description Typed persistence for worktree_removals — the server-side copy of ot-worktree's
 * removal log, written by the post-removal deregisterWorktreeCheckout call.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';

import { WorktreeRemoval } from './worktree-removal.entity.ts';
import type { RecordWorktreeRemovalInput } from './worktree-removals.types.ts';

@Injectable()
export class WorktreeRemovalsService {
  private readonly name = 'worktree-removals';

  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(WorktreeRemoval)
    private readonly repository: Repository<WorktreeRemoval>,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description The latest removal per path for a user, one row per path that has any. Used to
   * explain a "Missing on disk" checkout. Returns an empty list for an empty path list rather than
   * issuing an unbounded query.
   */
  async findLatestByUserAndPaths(
    userId: string,
    paths: readonly string[],
  ): Promise<WorktreeRemoval[]> {
    if (paths.length === 0) return [];

    return this.repository
      .createQueryBuilder('removal')
      .distinctOn(['removal.filesystemPath'])
      .where('removal.userId = :userId', { userId })
      .andWhere('removal.filesystemPath IN (:...paths)', { paths: [...paths] })
      .orderBy('removal.filesystemPath', 'ASC')
      .addOrderBy('removal.createdAt', 'DESC')
      .addOrderBy('removal.id', 'DESC')
      .getMany();
  }

  /** @description Appends one removal record and returns it. */
  async record(input: RecordWorktreeRemovalInput): Promise<WorktreeRemoval> {
    return this.repository.save(this.repository.create(input));
  }
}
