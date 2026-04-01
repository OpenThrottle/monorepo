# Investigation: Monthly/Yearly Pricing Toggle

**Plan-Id:** 48399bfa-b590-4b97-8e7d-3f1d01da8d5b
**Task-Id:** dea5f2d7-38ad-48cd-b913-452033562517

**Developer documentation:** For how the toggle works, architecture, and maintenance, see [README.md](./README.md).

## Resolved (post-investigation)

- **aria-selected:** Added on each `TabsTrigger` in `PricingToggle.tsx` so the selected tab is announced and keyboard behavior is correct.
- **URL param casing:** `parseIntervalFromSearchParams` now uses `raw?.toLowerCase() === 'yearly'` so `Yearly` and `YEARLY` show yearly pricing.

## Current implementation (at time of investigation)

### Data flow

1. **Route** (`app/routes/pricing._index.tsx`)
   - Uses `useSearchParams()` and derives `billingInterval` via `parseIntervalFromSearchParams(searchParams)`.
   - Passes `billingInterval` to `PricingToggle` as `value` and to each `PricingCard` as `billingInterval`.
   - `handleIntervalChange` calls `setSearchParams` with `interval=monthly` or `interval=yearly` (`replace: true`).

2. **Toggle** (`app/routing/pricing/components/PricingToggle.tsx`)
   - Receives `value: BillingInterval` and `onValueChange`.
   - Uses `@openthrottle/react-router-shadcn` `Tabs` (presentational only; no Radix context or internal state).
   - Each `TabsTrigger` has:
     - `data-state={value === 'monthly'|'yearly' ? 'active' : 'inactive'}` for styling.
     - `onClick={() => onValueChange('monthly'|'yearly')}`.
   - Selected state is fully controlled by the parent (URL → search params → `billingInterval` → `value`).

3. **URL parsing** (`app/routing/pricing/utils/index.ts`)
   - `parseIntervalFromSearchParams(searchParams)`: reads `interval`; returns `'yearly'` only when `raw === 'yearly'`, otherwise `'monthly'`.

4. **Cards** (`app/routing/pricing/components/PricingCard.tsx`)
   - Use `billingInterval` to choose `tier.priceYearly` vs `tier.priceMonthly` and label `/yr` vs `/mo`.

### Config

- `PRICING_INTERVAL_PARAM = 'interval'` in `app/routing/pricing/config/index.ts`.

## Possible causes of malfunction

1. **Missing `aria-selected`**
   Tab triggers only set `data-state` for CSS. They do not set `aria-selected="true"` / `aria-selected="false"`. That can break:
   - Screen reader announcement of the selected tab.
   - Keyboard navigation and focus behavior for the tab list.

2. **URL param casing**
   Logic uses `raw === 'yearly'`. Values like `?interval=Yearly` or `?interval=YEARLY` are treated as non-yearly and fall back to monthly. Any link or redirect that uses different casing will show monthly instead of yearly.

3. **Timing / re-renders**
   If `searchParams` updates slowly or the route re-renders before the URL is updated, the UI could briefly show the previous interval (e.g. monthly) after clicking yearly. Less likely with `replace: true` but possible under strict mode or heavy re-renders.

4. **No controlled API on Tabs root**
   The shadcn `Tabs` in this package are presentational (no `value`/`onValueChange` on the root). The parent is the single source of truth. If the parent ever passed a stale `value` (e.g. from another bug), the toggle would look wrong.

## Files touched

- `app/routes/pricing._index.tsx` – route, URL state, handlers.
- `app/routing/pricing/components/PricingToggle.tsx` – toggle UI and props.
- `app/routing/pricing/components/PricingCard.tsx` – uses `billingInterval` for price/label.
- `app/routing/pricing/utils/index.ts` – `parseIntervalFromSearchParams`.
- `app/routing/pricing/config/index.ts` – `PRICING_INTERVAL_PARAM`.

## Recommended next steps (for later tasks)

- Add `aria-selected={value === 'monthly'}` / `aria-selected={value === 'yearly'}` on the corresponding `TabsTrigger`s.
- Normalize URL param (e.g. `raw?.toLowerCase() === 'yearly'`) so casing does not break yearly.
- Optionally pass a stable key or ensure route re-renders only when `searchParams` actually change to avoid flicker.
