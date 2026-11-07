/**
 * Character caps for the shortened branch and path lines in
 * {@link ChatCheckoutSelectorRow}. Coupled to the popover width in
 * {@link ChatCheckoutSelector} (`w-[26rem]`): at `text-xs` this app measures
 * ~7.2px per character, and the narrowest text column — a nested worktree row,
 * after the icon, indent and check columns — measures 288px live, so 38
 * characters (~274px) fits with ~14px headroom. A cap wider than its column is worse than none:
 * the browser end-clips the already middle-shortened string. Change one number,
 * re-measure the other.
 */
export const CHECKOUT_ROW_MAX_CHARS = {
  branch: 38,
  path: 38,
} as const;
