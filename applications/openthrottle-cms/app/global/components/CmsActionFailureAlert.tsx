import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { CmsActionFailure } from '~/global/types/cms-action';

export interface CmsActionFailureAlertProps {
  readonly className: string | undefined;
  readonly copy: {
    readonly issuesTitle: string;
    /** Shown in place of an issue's empty JSON Pointer (the record as a whole). */
    readonly rootPath: string;
    readonly signIn: string;
  };
  readonly failure: CmsActionFailure;
  /** Where the sign-in link goes when the failure asks for one. */
  readonly signInHref: string;
}

/**
 * @description Why a cms save was refused: the message, a sign-in link when nobody is signed in,
 * and one line per server validation issue.
 */
export const CmsActionFailureAlert = (
  props: CmsActionFailureAlertProps,
): React.ReactElement => {
  const { className, copy, failure, signInHref } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const issueItems = failure.issues.map((issue) => {
    const path = issue.path === '' ? copy.rootPath : issue.path;

    return (
      <li key={`${issue.path}:${issue.message}`}>
        <code>{path}</code> {issue.message}
      </li>
    );
  });
  const signInLink = failure.requiresSignIn && (
    <Link className="font-medium underline" to={signInHref}>
      {copy.signIn}
    </Link>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Alert
      className={cn(className)}
      data-testid="CmsActionFailureAlert"
      variant="destructive"
    >
      <AlertTitle>{copy.issuesTitle}</AlertTitle>
      <AlertDescription>
        <p>
          {failure.message} {signInLink}
        </p>
        <ul className="list-disc pl-4">{issueItems}</ul>
      </AlertDescription>
    </Alert>
  );
};
