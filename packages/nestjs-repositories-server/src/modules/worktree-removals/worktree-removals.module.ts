import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorktreeRemoval } from './worktree-removal.entity.ts';
import { WorktreeRemovalsRepository } from './worktree-removals.repository.ts';

/**
 * @description Registers {@link WorktreeRemoval} on the default connection and provides
 * {@link WorktreeRemovalsRepository}.
 * @public
 */
@Module({
  exports: [WorktreeRemovalsRepository],
  imports: [TypeOrmModule.forFeature([WorktreeRemoval])],
  providers: [WorktreeRemovalsRepository],
})
export class WorktreeRemovalsModule {}
