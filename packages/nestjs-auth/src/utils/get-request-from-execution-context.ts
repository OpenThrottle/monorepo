import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AuthPrincipal } from '../auth-principal';
import type { JwtPayload } from '../strategies/jwt.strategy';

/** HTTP/GraphQL request shape after auth (JWT payload or {@link AuthPrincipal}). */
export type AuthenticatedRequest = {
  user?: AuthPrincipal | JwtPayload;
};

/**
 * @description Resolves the HTTP request from GraphQL or REST execution context.
 * Uses string coercion on {@link ExecutionContext.getType} to match openthrottle-server guards.
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
