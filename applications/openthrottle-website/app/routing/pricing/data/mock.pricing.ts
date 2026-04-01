/**
 * @description Mock pricing tiers and type for the pricing page. Demo, Pro Monthly, Pro Yearly.
 */

export interface PricingTier {
  readonly ctaLabel: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly id: string;
  readonly name: string;
  readonly popular?: boolean;
  readonly priceMonthly: number;
  readonly priceYearly: number | undefined;
  readonly trialLabel?: string;
}

/** Demo (free trial), Pro Monthly, Pro Yearly (~2 months free). */
export const MOCK_PRICING_TIERS: readonly PricingTier[] = [
  {
    ctaLabel: 'Start free trial',
    description: `Try OpenThrottle with full access for 7 days. No credit card required.`,
    features: [
      'Full feature access for 14 days',
      'All integrations',
      // 'Up to 3 team members',
      // 'Email support',
    ],
    id: 'demo',
    name: 'Demo',
    priceMonthly: 0,
    priceYearly: undefined,
    trialLabel: '14-day free trial',
  },
  {
    ctaLabel: 'Get Pro',
    description: `For teams that need full power and flexibility. Save ~2 months with yearly billing.`,
    features: [
      'Priority email support',
      'Advanced analytics',
      // 'Unlimited team members',
      // 'Custom workflows',
      'API access',
    ],
    id: 'pro',
    name: 'High Octane',
    popular: true,
    priceMonthly: 29,
    priceYearly: 290,
  },
] as const;

/**
 * @description Company pricing tier (employee-band based). Same shape as {@link PricingTier} so {@link PricingCard} can render it.
 */
export type CompanyPricingTier = PricingTier;

/** Companies tiers banded by employee count (1–50, 51–200, 201+). Mock data for pricing page. */
export const MOCK_COMPANY_TIERS: readonly CompanyPricingTier[] = [
  {
    ctaLabel: 'Contact sales',
    description: `For small teams. Full platform access and dedicated onboarding.`,
    features: [
      'Up to 50 employees',
      'Full feature access',
      'Email support',
      'Standard SLA',
    ],
    id: 'company-small',
    name: 'Small',
    priceMonthly: 99,
    priceYearly: 990,
  },
  {
    ctaLabel: 'Contact sales',
    description: `For growing teams. Advanced analytics and priority support.`,
    features: [
      '51-200 employees',
      'Advanced analytics',
      'Priority support',
      'Custom integrations',
    ],
    id: 'company-mid',
    name: 'Mid',
    popular: true,
    priceMonthly: 249,
    priceYearly: 2490,
  },
  {
    ctaLabel: 'Contact sales',
    description: `For large organizations. Enterprise features and dedicated success manager.`,
    features: [
      '201+ employees',
      'Enterprise SLA',
      'Dedicated success manager',
      'Custom contracts',
    ],
    id: 'company-enterprise',
    name: 'Enterprise',
    priceMonthly: 499,
    priceYearly: 4990,
  },
] as const;
