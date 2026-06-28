import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import type {
  StripeCheckoutUserPort,
  StripeProcessedEventsPort,
  StripeSubscriptionsPort,
} from './stripe-ports';

/**
 * @description Injection token for {@link StripeCheckoutUserPort} (wired by {@link StripeModule.forRootAsync}).
 */
export const STRIPE_CHECKOUT_USER_PORT = Symbol('STRIPE_CHECKOUT_USER_PORT');

/**
 * @description Optional injection token for {@link StripeProcessedEventsPort} (wired by {@link StripeModule.forRootAsync}).
 * Resolves to `null` when the app does not supply `processedEvents`, in which case replay protection is skipped.
 */
export const STRIPE_PROCESSED_EVENTS_PORT = Symbol(
  'STRIPE_PROCESSED_EVENTS_PORT',
);

/**
 * @description Injection token for {@link StripeSubscriptionsPort} (wired by {@link StripeModule.forRootAsync}).
 */
export const STRIPE_SUBSCRIPTIONS_PORT = Symbol('STRIPE_SUBSCRIPTIONS_PORT');

/**
 * @internal Init object from `useFactory`; not part of the public API.
 */
export const STRIPE_MODULE_INIT = Symbol('STRIPE_MODULE_INIT');

/**
 * @description Return value of `useFactory` for {@link StripeModule.forRootAsync}.
 */
export interface StripeModuleInit {
  readonly checkoutUser: StripeCheckoutUserPort;
  /**
   * @description Optional idempotency store. When supplied, verified webhook events are deduped by
   * `event.id` so Stripe retries and replays are acknowledged without re-dispatching. Omit to skip
   * replay protection (handlers remain best-effort idempotent via convergent upserts).
   */
  readonly processedEvents?: StripeProcessedEventsPort;
  readonly subscriptions: StripeSubscriptionsPort;
}

/**
 * @description Async registration options for {@link StripeModule.forRootAsync}.
 */
export interface StripeModuleAsyncOptions {
  readonly imports?: ModuleMetadata['imports'];
  readonly inject?: FactoryProvider<StripeModuleInit>['inject'];
  /** @description When true, register as a global module. */
  readonly isGlobal?: boolean;
  readonly useFactory: FactoryProvider<StripeModuleInit>['useFactory'];
}
