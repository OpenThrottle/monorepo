/**
 * @description The one rule for who a trajectory label belongs to, shared by the label mutations
 * and every read that shows "your" verdict: CLS displayName, then principal email, then subject.
 * There is no input path for it.
 */

import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import type { GlobalClsUser } from '@openthrottle/nestjs-modules';

import { resolveNoteAuthor } from '../notes/notes.utils.ts';

/**
 * @description The rater identity for the current request, or null on an unauthenticated path.
 */
export const resolveLabelRater = (
  clsUser: GlobalClsUser | undefined,
  principal: AuthPrincipal | undefined,
): string | null => {
  return resolveNoteAuthor(null, clsUser, principal);
};
