/**
 * @description Local (email/password) guard that gets the request from GraphQL context so Passport receives a valid request (avoids "Cannot read properties of undefined (reading 'logIn')").
 * Use with GqlLocalCredentialsGuard so request.body has username/password for LocalStrategy. Run GqlLocalCredentialsGuard first.
 */

import { type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { LOCAL_STRATEGY_NAME } from '../strategies/local.strategy';

@Injectable()
export class GqlLocalAuthGuard extends AuthGuard(LOCAL_STRATEGY_NAME) {
  override getRequest(context: ExecutionContext): unknown {
    // FIXME: Swap out eventually
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
