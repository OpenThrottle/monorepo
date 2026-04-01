/**
 * @description Resolves the HTTP request from either GraphQL or HTTP execution context.
 */

import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const getRequestFromExecutionContext = (
  context: ExecutionContext,
): unknown => {
  const isGraphql = `${context.getType()}` === 'graphql';

  if (isGraphql) {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext();
    const req =
      gqlContext != null &&
      typeof gqlContext === 'object' &&
      'req' in gqlContext
        ? Reflect.get(gqlContext, 'req')
        : undefined;

    if (req == null) {
      throw new Error(
        'GraphQL context missing req. Set context: ({ req }) => ({ req }) in GraphQLModule.forRoot.',
      );
    }

    return req;
  }

  return context.switchToHttp().getRequest();
};
