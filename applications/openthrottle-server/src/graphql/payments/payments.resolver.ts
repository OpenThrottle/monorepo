/**
 * @description GraphQL resolver for payments: Stripe catalog (public), checkout session (authenticated), and current user's subscription (entitlement).
 */

import {
  SubscriptionsService,
  type Subscription,
} from '@openthrottle/nestjs-repositories';
import { Public } from '@openthrottle/nestjs-auth';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CheckoutService,
  StripeProductObject,
  StripeProductsService,
  stripeProductToGql,
} from '@openthrottle/nestjs-stripe';
import { CreateCheckoutSessionInput } from './payments.input';
import {
  CreateCheckoutSessionPayload,
  SubscriptionObject,
} from './payments.object';

interface RequestWithUser {
  user?: { sub?: string };
}

@Resolver(() => SubscriptionObject)
export class PaymentsResolver {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly stripeProductsService: StripeProductsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Public()
  @Query(() => [StripeProductObject], {
    description: `Active Stripe products (catalog). Does not require authentication.`,
  })
  async stripeProducts(): Promise<StripeProductObject[]> {
    const products = await this.stripeProductsService.listActiveProducts();
    const priceMap =
      await this.stripeProductsService.listActivePricesForProducts(
        products.map((p) => p.id),
      );

    return products.map((product) =>
      stripeProductToGql(product, {
        prices: [...(priceMap.get(product.id) ?? [])],
      }),
    );
  }

  @Public()
  @Query(() => StripeProductObject, {
    description: `A single Stripe product by ID, or null if not found.`,
    nullable: true,
  })
  async stripeProduct(
    @Args('id', { type: () => String }) id: string,
  ): Promise<StripeProductObject | null> {
    const product = await this.stripeProductsService.getProductById(id);
    if (!product) {
      return null;
    }

    const priceMap =
      await this.stripeProductsService.listActivePricesForProducts([id]);

    return stripeProductToGql(product, {
      prices: [...(priceMap.get(id) ?? [])],
    });
  }

  @Mutation(() => CreateCheckoutSessionPayload, {
    description: `Create a Stripe Checkout session for the current user. Returns redirect URL for subscription signup.`,
  })
  async createCheckoutSession(
    @Args('input', { type: () => CreateCheckoutSessionInput })
    input: CreateCheckoutSessionInput,
    @Context() context: { req: RequestWithUser },
  ): Promise<CreateCheckoutSessionPayload> {
    const userId = context.req.user?.sub;
    if (!userId) {
      return { url: null };
    }

    const result = await this.checkoutService.createCheckoutSession({
      cancelUrl: input.cancelUrl,
      priceId: input.priceId,
      successUrl: input.successUrl,
      userId,
    });

    return { url: result.url };
  }

  @Query(() => SubscriptionObject, {
    description: `Current user's active subscription (entitlement). Null if none.`,
    nullable: true,
  })
  async mySubscription(
    @Context() context: { req: RequestWithUser },
  ): Promise<Subscription | null> {
    const userId = context.req.user?.sub;
    if (!userId) return null;

    return this.subscriptionsService.findActiveByUserId(userId);
  }
}
