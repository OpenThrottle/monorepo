/**
 * @description Validates workspace local repository fields per workspace-settings-graphql-design.md.
 */

import { resolve } from 'path';
import { validateWorkingDirectory } from '../plans/enqueue-plan-ralph-tuning';

const MAX_DISPLAY_NAME_LEN = 256;
const MAX_GIT_REMOTE_URL_LEN = 2048;
const MAX_GIT_DEFAULT_BRANCH_LEN = 256;

const GIT_REMOTE_URL_PROTOCOL = /^(https?|git|ssh):\/\/.+/i;

/**
 * @description Validates and canonicalizes an absolute filesystem directory path.
 */
export const validateAndNormalizeFilesystemPath = (raw: string): string => {
  if (raw.includes('\0')) {
    throw new Error('filesystemPath must not contain NUL');
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('filesystemPath is required');
  }

  const validated = validateWorkingDirectory(trimmed);
  if (validated === undefined) {
    throw new Error('filesystemPath is required');
  }

  return resolve(validated);
};

/**
 * @description Validates a non-empty display name for a local repository.
 */
export const validateDisplayName = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('displayName is required');
  }
  if (trimmed.length > MAX_DISPLAY_NAME_LEN) {
    throw new Error(
      `displayName must be at most ${MAX_DISPLAY_NAME_LEN} characters`,
    );
  }
  return trimmed;
};

/**
 * @description Validates optional git remote URL; returns null when omitted or blank.
 */
export const validateGitRemoteUrl = (
  raw: string | null | undefined,
): string | null => {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (trimmed.length > MAX_GIT_REMOTE_URL_LEN) {
    throw new Error(
      `gitRemoteUrl must be at most ${MAX_GIT_REMOTE_URL_LEN} characters`,
    );
  }
  if (!GIT_REMOTE_URL_PROTOCOL.test(trimmed)) {
    throw new Error('gitRemoteUrl must use http, https, git, or ssh protocol');
  }
  return trimmed;
};

/**
 * @description Validates optional default branch name; returns null when omitted or blank.
 */
export const validateGitDefaultBranch = (
  raw: string | null | undefined,
): string | null => {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (trimmed.length > MAX_GIT_DEFAULT_BRANCH_LEN) {
    throw new Error(
      `gitDefaultBranch must be at most ${MAX_GIT_DEFAULT_BRANCH_LEN} characters`,
    );
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('gitDefaultBranch must not contain path separators');
  }
  return trimmed;
};
