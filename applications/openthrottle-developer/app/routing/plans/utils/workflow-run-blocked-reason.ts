export interface WorkflowRunBlockedReasonInput<TReason> {
  readonly jobRunHooksBlocked: boolean;
  readonly jobRunHooksIssue: string | undefined;
  readonly resolvingWorkspaceReason: string;
  readonly runConfigSaveBlockedReason: TReason;
  readonly workspaceRepositoriesReady: boolean;
}

const JOB_RUN_HOOKS_FALLBACK_REASON = `Fix job run lifecycle hooks in Configuration.`;

/**
 * @description The resolving reason wins over the validation reasons while the
 * workspace is still loading: the config is not invalid then, merely
 * incomplete, and a validation error on a loading page reads as a bug.
 */
export const getWorkflowRunBlockedReason = <TReason>(
  input: WorkflowRunBlockedReasonInput<TReason>,
): string | TReason => {
  if (!input.workspaceRepositoriesReady) {
    return input.resolvingWorkspaceReason;
  }
  if (input.jobRunHooksBlocked) {
    return input.jobRunHooksIssue ?? JOB_RUN_HOOKS_FALLBACK_REASON;
  }
  return input.runConfigSaveBlockedReason;
};
