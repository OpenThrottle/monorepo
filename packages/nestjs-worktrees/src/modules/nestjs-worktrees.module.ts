import { Global, Module } from '@nestjs/common';
import { Mutex } from 'async-mutex';

import { WORKTREE_TRACKER_TOKEN } from '../config/nestjs-worktrees.constants.ts';
import type { IWorktreeTargetsTracker } from '../types/worktree.ts';
import { MutexWorktreeTargetsTracker } from '../utils/mutex-worktree-targets.ts';
import { WorktreeTargetsTracker } from '../utils/worktree-targets.ts';
import { getWorktreeTargetsFromEnv } from '../worktree-targets.env.ts';

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
