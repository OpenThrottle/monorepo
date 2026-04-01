import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../strategies/jwt.strategy';

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
  ): JwtPayload | JwtPayload[keyof JwtPayload] => {
    const request = getRequest(ctx);
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

/**
 * @description Gets the request from ExecutionContext. For GraphQL, uses GqlExecutionContext so context.req is used; for HTTP, uses switchToHttp().getRequest().
 */
function getRequest(ctx: ExecutionContext): { user?: JwtPayload } | undefined {
  if (ctx.getType<'http' | 'graphql'>() === 'graphql') {
    const gqlCtx = GqlExecutionContext.create(ctx);

    return gqlCtx.getContext<{ req?: { user?: JwtPayload } }>().req;
  }

  return ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
}
