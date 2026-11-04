/**
 * Shared types for `@openthrottle/react-router-graphql`.
 */

/**
 * Callbacks for {@link useSubscription}.
 *
 * @public
 */
export interface UseSubscriptionHandlers<TData> {
  /** Called when the server completes the subscription. */
  readonly onComplete?: () => void;
  /** Called with each subscription payload's `data`. */
  readonly onData: (data: TData) => void;
  /** Called on transport/operation error. */
  readonly onError?: (error: unknown) => void;
}
