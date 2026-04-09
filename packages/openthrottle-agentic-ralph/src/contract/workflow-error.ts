/**
 * @description Stable error shape for workflow steps; callers map from transport or GraphQL errors.
 */
export interface WorkflowError {
  readonly cause: Error | undefined;
  readonly code: string;
  readonly message: string;
}
