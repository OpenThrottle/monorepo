import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { WorktreeRemoval } from './worktree-removal.entity.ts';
import { WorktreeRemovalsService } from './worktree-removals.service.ts';

@Module({
  controllers: [],
  exports: [WorktreeRemovalsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([WorktreeRemoval])],
  providers: [WorktreeRemovalsService],
})
export class WorktreeRemovalsModule {}
