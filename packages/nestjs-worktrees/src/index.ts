export { WORKTREE_TRACKER_TOKEN } from './config/nestjs-worktrees.constants.ts';
export { NestjsWorktreesModule } from './modules/nestjs-worktrees.module.ts';
export type {
  AcquireResult,
  ChildJobFailure,
  ChildJobInput,
  ChildJobResult,
  ChildJobSuccess,
  IWorktreeTargetsTracker,
  ParentJobAcquireOptions,
  ParentJobAcquireResult,
  ParentJobEnsureCommitFailureChecks,
  ParentJobEnsureCommitFailureDirty,
  ParentJobEnsureCommitOptions,
  ParentJobEnsureCommitResult,
  ParentJobEnsureCommitSuccess,
  ParentJobHandoff,
  PushBranchResult,
  ReleaseResult,
  WorkflowLoopResult,
  WorktreeTarget,
  WorktreeTargetAvailable,
  WorktreeTargetLocked,
  WorktreeTargetStatus,
  WorktreeWorkflowOptions,
  WorktreeWorkflowResult,
} from './types/worktree.ts';
export type { IMutexWorktreeTargetsTracker } from './utils/mutex-worktree-targets.ts';
export {
  createMutexWorktreeTargetsTracker,
  MutexWorktreeTargetsTracker,
} from './utils/mutex-worktree-targets.ts';
export {
  createBranchInWorktree,
  deriveBranchName,
  hasCommitsAheadOfRemote,
  isWorktreeClean,
  parentJobAcquireAndCreateBranch,
  parentJobEnsureCommitBeforeRelease,
  pushBranchToRemote,
} from './utils/parent-job.ts';
export { runWorktreeWorkflow } from './utils/workflow.ts';
export { WorktreeTargetsTracker } from './utils/worktree-targets.ts';
export { getWorktreeTargetsFromEnv } from './worktree-targets.env.ts';
