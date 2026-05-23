import { type ExecutionContext, Injectable } from '@nestjs/common';
import {
  getRequestFromExecutionContext,
  JwtAuthGuard,
} from '@openthrottle/nestjs-auth';

/**
 * @description JWT guard that gets the request from GraphQL context so Passport receives a valid request (avoids "Cannot read properties of undefined (reading 'logIn')").
 * Use this instead of JwtAuthGuard when protecting GraphQL resolvers; for REST, falls back to switchToHttp().getRequest().
 */
@Injectable()
export class GqlJwtAuthGuard extends JwtAuthGuard {
  override getRequest(context: ExecutionContext): unknown {
    return getRequestFromExecutionContext(context);
  }
}
