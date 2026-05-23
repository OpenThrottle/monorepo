import {
  normalizeRequestAuthPrincipal,
  type AuthPrincipal,
} from '../auth-principal';

/**
 * @description Returns {@link AuthPrincipal} from an HTTP-like request, or undefined if missing/invalid.
 */
export const getAuthPrincipalFromRequest = (
  req: unknown,
): AuthPrincipal | undefined => {
  if (typeof req !== 'object' || req === null || !('user' in req)) {
    return undefined;
  }

  return normalizeRequestAuthPrincipal(Reflect.get(req, 'user'));
};
