/**
 * @description Copies GraphQL login mutation input onto the request body so AuthGuard('local') can read credentials. Run before AuthGuard('local') on the login mutation. Validates the credential shape/length first and rejects malformed input before it reaches Passport's LocalStrategy.
 */

import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/** RFC 5321 maximum total email length. */
const MAX_EMAIL_LENGTH = 320;

/** Upper bound for an accepted password; longer values are rejected before hashing. */
const MAX_PASSWORD_LENGTH = 256;

@Injectable()
export class GqlLocalCredentialsGuard implements CanActivate {
  constructor(private readonly logger: LoggerService) {}

  canActivate(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs<{
      input?: { email?: unknown; password?: unknown };
    }>();

    const email = args.input?.email;
    const password = args.input?.password;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length === 0 ||
      password.length === 0 ||
      email.length > MAX_EMAIL_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      // Log the rejection without the credential values themselves.
      this.logger.warn(
        'Rejected login with malformed credentials',
        GqlLocalCredentialsGuard.name,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const request = gqlContext.getContext<{
      req: { body?: Record<string, unknown> };
    }>().req;

    if (!request.body) {
      request.body = {};
    }

    const { body } = request;

    body.username = email;
    body.password = password;

    return true;
  }
}
