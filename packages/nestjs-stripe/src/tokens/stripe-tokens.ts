import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import type {
  StripeCheckoutUserPort,
  StripeSubscriptionsPort,
} from './stripe-ports';

/**
 * @description Injection token for {@link StripeCheckoutUserPort} (wired by {@link StripeModule.forRootAsync}).
 */
export const STRIPE_CHECKOUT_USER_PORT = Symbol('STRIPE_CHECKOUT_USER_PORT');

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
  readonly subscriptions: StripeSubscriptionsPort;
}

/**
 * @description Async registration options for {@link StripeModule.forRootAsync}.
 */
export interface StripeModuleAsyncOptions {
  readonly inject?: FactoryProvider<StripeModuleInit>['inject'];
  readonly imports?: ModuleMetadata['imports'];
  /** @description When true, register as a global module. */
  readonly isGlobal?: boolean;
  readonly useFactory: FactoryProvider<StripeModuleInit>['useFactory'];
}
