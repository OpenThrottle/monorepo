import branch from 'react-native-branch';

/**
 * @description Singleton handle for the default Branch SDK instance from `react-native-branch`.
 */
export type BranchInstance = typeof branch;

/**
 * @description Options applied only on the first successful {@link initializeBranch} call.
 */
export interface InitializeBranchOptions {
  readonly initSessionTtl?: number;
  /**
   * @description How to handle subsequent calls to {@link initializeBranch}.
   * @default 'warn'
   */
  readonly onDuplicateInit?: 'ignore' | 'throw' | 'warn';
}

let initialized = false;

const shouldWarnDuplicate = (): boolean => {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }
  return process.env['NODE_ENV'] !== 'production';
};

const warnDuplicateInitializeBranch = (
  onDuplicateInit: 'ignore' | 'throw' | 'warn',
): void => {
  if (onDuplicateInit !== 'warn' || !shouldWarnDuplicate()) {
    return;
  }
  console.warn(
    '[@shiftsmartinc/react-native-branch] initializeBranch() called more than once; ignored.',
  );
};

/**
 * @description Idempotent JS-side setup for the Branch singleton (for example `initSessionTtl`).
 * Native keys and Branch keys belong in app config / `app.config` via the Expo plugin.
 */
export const initializeBranch = (
  options: InitializeBranchOptions = {},
): BranchInstance => {
  const { initSessionTtl, onDuplicateInit = 'warn' } = options;

  if (initialized) {
    if (onDuplicateInit === 'throw') {
      throw new Error(
        '[@shiftsmartinc/react-native-branch] initializeBranch() was already called.',
      );
    }
    warnDuplicateInitializeBranch(onDuplicateInit);
    return branch;
  }

  if (typeof initSessionTtl === 'number' && Number.isFinite(initSessionTtl)) {
    branch.initSessionTtl = initSessionTtl;
  }

  initialized = true;
  return branch;
};

/**
 * @description Returns the Branch singleton after {@link initializeBranch} has completed once.
 */
export const getBranch = (): BranchInstance => {
  if (!initialized) {
    throw new Error(
      '[@shiftsmartinc/react-native-branch] Call initializeBranch() before getBranch().',
    );
  }
  return branch;
};
