import { type ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtAuthGuard } from '@openthrottle/nestjs-auth';

/**
 * @description JWT guard that gets the request from GraphQL context so Passport receives a valid request (avoids "Cannot read properties of undefined (reading 'logIn')").
 * Use this instead of JwtAuthGuard when protecting GraphQL resolvers; for REST, falls back to switchToHttp().getRequest().
 */
@Injectable()
export class GqlJwtAuthGuard extends JwtAuthGuard {
  override getRequest(context: ExecutionContext): unknown {
    if ((context.getType() as string) === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      const req = ctx.getContext<{ req: unknown }>().req;

      if (req == null) {
        throw new Error(
          'GraphQL context missing req. Set context: ({ req }) => ({ req }) in GraphQLModule.forRoot.',
        );
      }

      return req;
    }

    return context.switchToHttp().getRequest();
  }
}
