import type { ProfileExecutionResult } from './profile-execution.types';

type Reporter = (result: ProfileExecutionResult) => void;

let reporter: Reporter | undefined;

/**
 * @description Sets the global reporter for profile execution results. Used by file writer or other consumers.
 */
export function setProfileExecutionReporter(fn: Reporter | undefined): void {
  reporter = fn;
}

/**
 * @description Gets the current reporter, if any.
 */
export function getProfileExecutionReporter(): Reporter | undefined {
  return reporter;
}

/**
 * @description Notifies the current reporter with a result, if one is set.
 */
export function notifyProfileExecutionReporter(result: ProfileExecutionResult): void {
  reporter?.(result);
}
