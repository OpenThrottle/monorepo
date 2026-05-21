import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../strategies/jwt.strategy';
import { getRequestFromExecutionContext } from '../utils/get-request-from-execution-context';

/**
 * @description Extracts the authenticated user from the request.
 * Use with @UseGuards(JwtAuthGuard) (REST) or GqlJwtAuthGuard (GraphQL). The user comes from the JWT payload after validation.
 * For GraphQL, the request is read from context.req (set via GraphQLModule context: ({ req }) => ({ req })).
 *
 * @example REST
 * ```ts
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 * ```
 *
 * @example With property selector (GraphQL)
 * ```ts
 * @Query(() => UserObject)
 * me(@CurrentUser('sub') userId: string) {
 *   return this.usersService.findById(userId);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | JwtPayload[keyof JwtPayload] | undefined => {
    const request = getRequestFromExecutionContext(ctx);
    const user = request?.user;

    if (!user) {
      return undefined;
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
