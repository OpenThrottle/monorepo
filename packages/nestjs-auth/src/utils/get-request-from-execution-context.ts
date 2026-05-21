import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../strategies/jwt.strategy';

/**
 * @description Resolves the HTTP request from GraphQL or REST execution context.
 * Uses string coercion on {@link ExecutionContext.getType} to match openthrottle-server guards.
 */
export const getRequestFromExecutionContext = (
  ctx: ExecutionContext,
): { user?: JwtPayload } | undefined => {
  const isGraphql = `${ctx.getType()}` === 'graphql';

  if (isGraphql) {
    const gqlCtx = GqlExecutionContext.create(ctx);
    const req = gqlCtx.getContext<{ req?: { user?: JwtPayload } }>().req;

    if (req == null) {
      throw new Error(
        'GraphQL context missing req. Set context: ({ req }) => ({ req }) in GraphQLModule.forRoot.',
      );
    }

    return req;
  }

  return ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
};
