export { NestjsWorktreesModule } from './nestjs-worktrees.module';
export { WORKTREE_TRACKER_TOKEN } from './nestjs-worktrees.constants';
export { getWorktreeTargetsFromEnv } from './worktree-targets.env';

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
} from './types/worktree';
export { runChildJob } from './utils/child-job';
export type { IMutexWorktreeTargetsTracker } from './utils/mutex-worktree-targets';
export {
  createMutexWorktreeTargetsTracker,
  MutexWorktreeTargetsTracker,
} from './utils/mutex-worktree-targets';
export {
  createBranchInWorktree,
  deriveBranchName,
  hasCommitsAheadOfRemote,
  isWorktreeClean,
  parentJobAcquireAndCreateBranch,
  parentJobEnsureCommitBeforeRelease,
  pushBranchToRemote,
} from './utils/parent-job';
export { runWorktreeWorkflow } from './utils/workflow';
export { WorktreeTargetsTracker } from './utils/worktree-targets';
