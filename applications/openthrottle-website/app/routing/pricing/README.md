# Pricing Page

Pricing page feature for the OpenThrottle website, including the monthly/yearly billing interval toggle and pricing cards.

## Overview

- **Route:** `app/routes/pricing._index.tsx`
- **State:** Billing interval (monthly vs yearly) is stored in the URL as the `interval` search param. The route is the single source of truth; the toggle and cards are fully controlled.

## Monthly/Yearly Toggle

### Behavior

- The toggle switches between **Monthly** and **Yearly** pricing.
- The selected interval is reflected in the URL: `?interval=monthly` or `?interval=yearly`.
- URL param casing is normalized: `interval=yearly`, `Yearly`, and `YEARLY` all show yearly pricing. Any other value (or missing param) defaults to monthly.
- Changing the toggle updates the URL with `replace: true` (no new history entry) and causes the route to re-render with the new interval; all pricing cards update accordingly.

### Architecture

1. **Route** (`app/routes/pricing._index.tsx`)
   - Reads `interval` via `parseIntervalFromSearchParams(searchParams)`.
   - Passes `billingInterval` to `PricingToggle` as `value` and to each `PricingCard` as `billingInterval`.
   - `handleIntervalChange` calls `setSearchParams` with `interval=monthly` or `interval=yearly`.

2. **Toggle** (`app/routing/pricing/components/PricingToggle.tsx`)
   - Controlled component: `value: BillingInterval`, `onValueChange: (value: BillingInterval) => void`.
   - Uses `@openthrottle/react-router-shadcn` `Tabs` / `TabsList` / `TabsTrigger` for presentation only; selection is driven by the parent.
   - Each trigger sets `data-state` for styling and `aria-selected` for accessibility.

3. **URL parsing** (`app/routing/pricing/utils/index.ts`)
   - `parseIntervalFromSearchParams(searchParams)`: returns `'yearly'` when the param (lowercased) is `'yearly'`, otherwise `'monthly'`.

4. **Cards** (`app/routing/pricing/components/PricingCard.tsx`)
   - Accept `billingInterval` and display `tier.priceMonthly`/`tier.priceYearly` and `/mo` or `/yr` accordingly.

### Key files

| File                           | Purpose                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `config/index.ts`              | `PRICING_INTERVAL_PARAM` (`'interval'`) for the URL param key.                           |
| `types.ts`                     | `BillingInterval` type and `BILLING_INTERVAL_OPTIONS` for toggle labels/values.          |
| `utils/index.ts`               | `parseIntervalFromSearchParams()` for reading and normalizing the interval from the URL. |
| `components/PricingToggle.tsx` | Toggle UI; controlled by parent.                                                         |
| `components/PricingCard.tsx`   | Renders one tier; uses `billingInterval` for price and unit label.                       |

### Extending or changing the toggle

- **Add/change interval options:** Edit `BILLING_INTERVAL_OPTIONS` in `types.ts` and extend `BillingInterval`. Update `parseIntervalFromSearchParams` and any tier data (`priceMonthly`, `priceYearly`, etc.) to support the new value.
- **Change URL param name:** Update `PRICING_INTERVAL_PARAM` in `config/index.ts` and any links or redirects that set the param.

### Troubleshooting

- **Toggle doesn’t reflect URL:** Ensure the route passes `billingInterval` from `parseIntervalFromSearchParams(searchParams)` into `PricingToggle` as `value`. Do not derive interval from local state.
- **Yearly not showing for `?interval=yearly`:** Param is case-insensitive; if it still fails, check that nothing overwrites the param and that `parseIntervalFromSearchParams` is used with the same `URLSearchParams` instance the route uses.
- **Accessibility:** Triggers use `aria-selected`; if you change the toggle implementation, keep `aria-selected` in sync with the selected option.

For investigation notes and historical context, see [INVESTIGATION-TOGGLE.md](./INVESTIGATION-TOGGLE.md).
