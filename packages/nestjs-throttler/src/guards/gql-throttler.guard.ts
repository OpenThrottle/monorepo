import { type ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * GraphQL execution context shape produced by the server's `context` factory.
 */
interface GraphqlThrottlerContext {
  readonly req?: GraphqlThrottlerRequest;
  readonly res?: Record<string, unknown>;
}

/**
 * HTTP request as seen on the GraphQL context (Express request under Apollo).
 */
interface GraphqlThrottlerRequest extends Record<string, unknown> {
  readonly res?: Record<string, unknown>;
}

/**
 * Minimal `GraphQLResolveInfo` shape needed to detect the operation kind.
 */
interface GraphqlThrottlerInfo {
  readonly operation?: { readonly operation?: string };
}

const isGraphqlContext = (context: ExecutionContext): boolean => {
  return `${context.getType()}` === 'graphql';
};

const isSubscriptionOperation = (gqlContext: GqlExecutionContext): boolean => {
  const info = gqlContext.getInfo<GraphqlThrottlerInfo | undefined>();

  return info?.operation?.operation === 'subscription';
};

/**
 * @description GraphQL-aware {@link ThrottlerGuard}.
 *
 * The stock guard resolves the request via `context.switchToHttp()`, which
 * returns `undefined` under GraphQL — so its default `getTracker` throws
 * `Cannot read properties of undefined (reading 'ip')` on every GraphQL
 * operation. GraphQL resolvers instead carry the Express request on the
 * GraphQL context (`context: ({ req }) => ({ req })` in `GraphQLModule.forRoot`).
 *
 * This subclass reads the request from the GraphQL context for GraphQL
 * operations (falling back to the stock HTTP resolution for REST), and skips
 * throttling for graphql-ws subscriptions, whose context intentionally carries
 * no `req` and therefore has no IP to rate-limit by.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  } {
    if (isGraphqlContext(context)) {
      const gqlContext =
        GqlExecutionContext.create(
          context,
        ).getContext<GraphqlThrottlerContext>();
      const req = gqlContext.req ?? {};

      return { req, res: gqlContext.res ?? req.res ?? {} };
    }

    return super.getRequestResponse(context);
  }

  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    if (isGraphqlContext(context)) {
      const gqlContext = GqlExecutionContext.create(context);
      const { req, res } = gqlContext.getContext<GraphqlThrottlerContext>();

      // Subscriptions ride graphql-ws: there is no client IP to track and no
      // HTTP response to attach rate-limit headers to (the stock guard calls
      // `res.header(...)`). Skip them rather than crash. The absent-`req` guard
      // covers connection-time contexts that haven't been resolved yet.
      if (req == null || isSubscriptionOperation(gqlContext)) {
        return true;
      }

      // Mutations/queries executed OVER the graphql-ws socket land here too:
      // @nestjs/apollo surfaces the ws upgrade request as `req`, so the check
      // above passes — but there is still no Express response to set
      // rate-limit headers on. Skip whenever no usable `res.header` exists.
      const httpResponse = (res ?? req.res) as { header?: unknown } | undefined;
      if (typeof httpResponse?.header !== 'function') {
        return true;
      }
    }

    return super.shouldSkip(context);
  }
}
