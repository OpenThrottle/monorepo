/**
 * @description One server validation issue: the JSON Pointer of the failing value (`''` for the
 * record as a whole) and what is wrong with it.
 */
export interface CmsActionIssue {
  readonly message: string;
  readonly path: string;
}

/**
 * @description A cms route action that did not save: the message to show, any server validation
 * issues, and whether the refusal was for want of a session.
 */
export interface CmsActionFailure {
  readonly issues: readonly CmsActionIssue[];
  readonly message: string;
  readonly ok: false;
  /** The server refused because nobody is signed in: offer a way to sign in. */
  readonly requiresSignIn: boolean;
}

/**
 * @description The route's own wording for the refusals {@link CmsActionFailure} distinguishes.
 */
export interface CmsActionFailureCopy {
  readonly forbidden: string;
  readonly invalid: string;
  readonly unauthenticated: string;
}
