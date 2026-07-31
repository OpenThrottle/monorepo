/**
 * @description True when a component receives both `value` and `onValueChange`
 * (fully controlled), so internal/url-synced state should be bypassed. Hoisted
 * out of OpenThrottleTabsWithUrlSync per component-primitive-shape R4.
 */
export const isFullyControlled = (
  value: unknown,
  onValueChange: unknown,
): boolean => value !== undefined && onValueChange !== undefined;
