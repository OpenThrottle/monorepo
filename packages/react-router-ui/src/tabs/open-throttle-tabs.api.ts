/**
 * Spike API contract for OpenThrottle tabs (plan cf15cc9e).
 * Implementation tasks import these types; do not change names without updating the plan.
 */
import type { ComponentPropsWithoutRef } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type {
  TabsProps,
  tabsListVariants,
} from '@openthrottle/react-router-shadcn';
import type { NavLinkProps } from 'react-router';

/** Approach A — optional URL sync for controlled Radix tabs (same route, search param). */
export interface UrlSyncedTabConfig<TTab extends string = string> {
  readonly defaultValue: TTab;
  readonly param: string;
  readonly parse?: (raw: string | null) => TTab | undefined;
}

export interface OpenThrottleTabsProps extends TabsProps {
  /**
   * When set, `value` / `onValueChange` are driven by {@link useUrlSyncedTabValue}
   * unless the caller passes explicit `value` and `onValueChange` (fully controlled).
   */
  readonly urlSync?: UrlSyncedTabConfig;
}

export interface UseUrlSyncedTabValueOptions<TTab extends string = string> {
  readonly defaultValue: TTab;
  readonly param: string;
  readonly parse?: (raw: string | null) => TTab | undefined;
}

export interface UseUrlSyncedTabValueResult<TTab extends string = string> {
  readonly onValueChange: (next: string) => void;
  readonly value: TTab;
}

/** Approach B — link tab bar list container (not Radix TabsList). */
export interface OpenThrottleTabsNavProps extends ComponentPropsWithoutRef<'nav'> {
  readonly variant?: VariantProps<typeof tabsListVariants>['variant'];
}

/** Approach B — single tab link styled like TabsTrigger. */
export interface OpenThrottleTabLinkProps extends NavLinkProps {
  readonly prefetch?: NavLinkProps['prefetch'];
}
