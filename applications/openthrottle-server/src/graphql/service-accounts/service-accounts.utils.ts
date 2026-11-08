/**
 * @description Ensures the request principal is a human JWT user (not a service account).
 */

import { ForbiddenException } from '@nestjs/common';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
  type UserAuthPrincipal,
} from '@openthrottle/nestjs-auth';

export const assertHumanAuthPrincipal = (
  principal: AuthPrincipal | undefined,
): UserAuthPrincipal => {
  if (principal?.kind !== AUTH_PRINCIPAL_KIND_USER) {
    throw new ForbiddenException('Human authentication required');
  }
  return principal;
};
