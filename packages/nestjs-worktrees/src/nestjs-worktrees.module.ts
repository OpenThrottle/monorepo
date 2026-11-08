import { Global, Module } from '@nestjs/common';
import { Mutex } from 'async-mutex';

import { WORKTREE_TRACKER_TOKEN } from './config/config.constants.ts';
import { MutexWorktreeTargetsTracker } from './mutex-worktree-targets/mutex-worktree-targets.strategy.ts';
import type { IWorktreeTargetsTracker } from './nestjs-worktrees.types.ts';
import { getWorktreeTargetsFromEnv } from './nestjs-worktrees.utils.ts';
import { WorktreeTargetsTracker } from './worktree-targets/worktree-targets.strategy.ts';

/**
 * @description Provides a mutex-wrapped worktree targets tracker from WORKTREE_TARGETS env.
 * The mutex ensures safe concurrent acquire/release for BullMQ workers with CONCURRENCY > 1.
 * Import this module where you need to inject the tracker (e.g. BullMQ processors).
 */
@Global()
@Module({
  exports: [WORKTREE_TRACKER_TOKEN],
  providers: [
    {
      provide: WORKTREE_TRACKER_TOKEN,
      useFactory: (): IWorktreeTargetsTracker => {
        const baseTracker = new WorktreeTargetsTracker([
          ...getWorktreeTargetsFromEnv(),
        ]);

        return new MutexWorktreeTargetsTracker(baseTracker, new Mutex());
      },
    },
  ],
})
export class NestjsWorktreesModule {}
