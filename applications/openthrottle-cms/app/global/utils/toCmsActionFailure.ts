import { isRecord, toErrorMessage } from '@openthrottle/nodejs-utils';
import {
  getGraphqlErrorCode,
  isAuthError,
  isGraphqlResponseError,
} from '@openthrottle/react-router-graphql';

import type {
  CmsActionFailure,
  CmsActionFailureCopy,
  CmsActionIssue,
} from '~/global/types/cms-action';

const readIssues = (value: unknown): readonly CmsActionIssue[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item: unknown) => {
    if (!isRecord(item)) return [];
    const { instancePath, message } = item;
    if (typeof message !== 'string') return [];
    const path = typeof instancePath === 'string' ? instancePath : '';

    return [{ message, path }];
  });
};

const failure = (
  message: string,
  issues: readonly CmsActionIssue[] = [],
): CmsActionFailure => {
  return { issues, message, ok: false, requiresSignIn: false };
};

const signInRequired = (copy: CmsActionFailureCopy): CmsActionFailure => {
  return {
    issues: [],
    message: copy.unauthenticated,
    ok: false,
    requiresSignIn: true,
  };
};

/**
 * @description The action result for a failed cms mutation: server validation issues for
 * `BAD_USER_INPUT`, a sign-in prompt (`requiresSignIn`) when nobody is signed in, a permission
 * message for a signed-in user without `cms:write`, otherwise the error's own message. `copy`
 * carries the calling route's wording for each refusal.
 */
export const toCmsActionFailure = (
  error: unknown,
  copy: CmsActionFailureCopy,
): CmsActionFailure => {
  if (isAuthError(error)) {
    return signInRequired(copy);
  }

  if (!isGraphqlResponseError(error)) {
    return failure(toErrorMessage(error));
  }

  switch (getGraphqlErrorCode(error)) {
    case 'BAD_USER_INPUT': {
      const read = readIssues(error.extensions['issues']);

      return read.length > 0
        ? failure(copy.invalid, read)
        : failure(error.message);
    }
    case 'FORBIDDEN':
      return failure(copy.forbidden);
    case 'UNAUTHENTICATED':
      return signInRequired(copy);
    default:
      return failure(error.message);
  }
};
