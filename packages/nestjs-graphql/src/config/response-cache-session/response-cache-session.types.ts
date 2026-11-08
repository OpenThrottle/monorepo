import type { BaseContext } from '@apollo/server';

/**
 * Minimal structural subset of Apollo's `GraphQLRequestContext` this helper
 * reads: the resolved context value and the optional HTTP request headers. A
 * full `GraphQLRequestContext<TContext>` is assignable to this, so the helper
 * is usable directly as the plugin's `sessionId` without a cast, while tests can
 * construct a fixture without standing up the entire request-context surface.
 */
export interface ResponseCacheSessionRequestContext<
  TContext extends BaseContext,
> {
  readonly contextValue: TContext;
  readonly request: {
    readonly http?: {
      readonly headers?: { get(name: string): string | null | undefined };
    };
  };
}
