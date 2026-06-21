import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AuthPrincipal } from '../auth-principal';
import type { JwtPayload } from '../strategies/jwt.strategy';

/** HTTP/GraphQL request shape after auth (JWT payload or {@link AuthPrincipal}). */
export type AuthenticatedRequest = {
  user?: AuthPrincipal | JwtPayload;
};

/**
 * @description Resolves the HTTP request from a Nest {@link ExecutionContext}
 * (GraphQL or REST). Uses string coercion on {@link ExecutionContext.getType} to
 * match openthrottle-server guards.
 *
 * Intended split (these two helpers are complementary, not redundant):
 * - `getRequestFromExecutionContext(ctx)` — input is a Nest `ExecutionContext`;
 *   returns the raw request object. Use inside guards/interceptors that hold a
 *   context.
 * - {@link getAuthPrincipalFromRequest} — input is an already-extracted raw request;
 *   returns the normalized {@link AuthPrincipal}. Use after this helper, or when you
 *   already have a request (e.g. middleware) and never had a context.
 *
 * Typical pairing: `getAuthPrincipalFromRequest(getRequestFromExecutionContext(ctx))`.
 */
export const getRequestFromExecutionContext = (
  ctx: ExecutionContext,
): AuthenticatedRequest | undefined => {
  const isGraphql = `${ctx.getType()}` === 'graphql';

  if (isGraphql) {
    const gqlCtx = GqlExecutionContext.create(ctx);
    const req = gqlCtx.getContext<{ req?: AuthenticatedRequest }>().req;

    if (req == null) {
      throw new Error(
        'GraphQL context missing req. Set context: ({ req }) => ({ req }) in GraphQLModule.forRoot.',
      );
    }

    return req;
  }

  return ctx.switchToHttp().getRequest<AuthenticatedRequest>();
};
