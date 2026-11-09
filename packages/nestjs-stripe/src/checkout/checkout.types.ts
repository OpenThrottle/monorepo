export interface CreateCheckoutSessionParams {
  readonly cancelUrl: string;
  readonly priceId: string;
  readonly successUrl: string;
  readonly userId: string;
}

export interface CreateCheckoutSessionResult {
  readonly url: string | null;
}
