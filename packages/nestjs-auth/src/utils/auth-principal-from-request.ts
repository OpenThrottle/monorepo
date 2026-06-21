import {
  normalizeRequestAuthPrincipal,
  type AuthPrincipal,
} from '../auth-principal';

/**
 * @description Returns {@link AuthPrincipal} from an HTTP-like request, or undefined
 * if missing/invalid.
 *
 * Intended split (complementary, not redundant): this helper takes an
 * already-extracted raw request and normalizes `request.user` to an
 * {@link AuthPrincipal}. To obtain the request from a Nest `ExecutionContext` first,
 * use `getRequestFromExecutionContext`; typical pairing is
 * `getAuthPrincipalFromRequest(getRequestFromExecutionContext(ctx))`.
 */
export const getAuthPrincipalFromRequest = (
  req: unknown,
): AuthPrincipal | undefined => {
  if (typeof req !== 'object' || req === null || !('user' in req)) {
    return undefined;
  }

  return normalizeRequestAuthPrincipal(Reflect.get(req, 'user'));
};
