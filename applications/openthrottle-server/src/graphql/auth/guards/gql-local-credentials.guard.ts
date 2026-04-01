/**
 * @description Copies GraphQL login mutation input onto the request body so AuthGuard('local') can read credentials. Run before AuthGuard('local') on the login mutation.
 */

import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import {
  type ExecutionContext,
  Injectable,
  type CanActivate,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlLocalCredentialsGuard implements CanActivate {
  constructor(private readonly logger: LoggerService) {}

  canActivate(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs();

    this.logger.info('🔑 gql-local-credentials-guard', { args });

    const request = gqlContext.getContext<{
      req: { body?: Record<string, unknown> };
    }>().req;

    if (!request?.body) {
      request.body = {};
    }

    const body = request.body;

    body.username = args.input?.email ?? '';
    body.password = args.input?.password ?? '';

    this.logger.info('🔑 gql-local-credentials-guard', { body });

    return true;
  }
}
