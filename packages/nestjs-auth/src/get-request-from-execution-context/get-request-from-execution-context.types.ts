import type { AuthPrincipal } from '../auth-principal/auth-principal.types.ts';
import type { JwtPayload } from '../strategies/jwt.strategy.ts';
/** HTTP/GraphQL request shape after auth (JWT payload or {@link AuthPrincipal}). */
export type AuthenticatedRequest = {
  user?: AuthPrincipal | JwtPayload;
};
