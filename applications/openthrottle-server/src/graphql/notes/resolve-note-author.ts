/**
 * @description Pure precedence rule for a new note's `author`. An explicit
 * non-blank input always wins so `openthrottle-mcp`'s `create_note` pass-through
 * keeps working; otherwise the value is stamped from the request identity.
 */

import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import type { GlobalClsUser } from '@openthrottle/nestjs-modules';

const firstNonBlank = (
  ...candidates: readonly (string | null | undefined)[]
): string | null => {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();

    if (trimmed != null && trimmed !== '') return trimmed;
  }

  return null;
};

/**
 * @description Resolves the author to persist: explicit input → CLS displayName
 * (the caller's `users.github_username`, or the service-account name) →
 * principal email → principal subject → `null` on public/pre-auth paths.
 */
export const resolveNoteAuthor = (
  inputAuthor: string | null | undefined,
  clsUser: GlobalClsUser | undefined,
  principal: AuthPrincipal | undefined,
): string | null =>
  firstNonBlank(
    inputAuthor,
    clsUser?.displayName,
    principal != null && 'email' in principal ? principal.email : null,
    principal?.sub,
  );
