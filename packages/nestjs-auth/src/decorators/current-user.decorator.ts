import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import {
  getAuthPrincipalSub,
  normalizeRequestAuthPrincipal,
  type AuthPrincipal,
} from '../auth-principal';
import { getRequestFromExecutionContext } from '../utils/get-request-from-execution-context';

/** Fields selectable via `@CurrentUser('sub')` on {@link AuthPrincipal}. */
export type CurrentUserProperty = 'sub' | 'kind';

/**
 * @description Extracts the authenticated principal from the request (human JWT or service account).
 * Use with JWT or global auth guards. Legacy JWT payloads without `kind` are normalized to user principals.
 * For GraphQL, the request is read from context.req (set via GraphQLModule context: ({ req }) => ({ req })).
 *
 * @example REST
 * ```ts
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() principal: AuthPrincipal) {
 *   return principal;
 * }
 * ```
 *
 * @example With property selector (GraphQL)
 * ```ts
 * @Query(() => UserObject)
 * me(@CurrentUser('sub') subjectId: string) {
 *   return this.usersService.findById(subjectId);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (
    data: CurrentUserProperty | undefined,
    ctx: ExecutionContext,
  ): AuthPrincipal | string | undefined => {
    const request = getRequestFromExecutionContext(ctx);
    const principal = normalizeRequestAuthPrincipal(request?.user);

    if (!principal) {
      return undefined;
    }

    if (data === 'sub') {
      return getAuthPrincipalSub(principal);
    }

    if (data === 'kind') {
      return principal.kind;
    }

    return principal;
  },
);
