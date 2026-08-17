/**
 * @description True for an absolute `http(s)://` target. Such a target must not
 * go through react-router's `Link` (which treats it as in-app navigation and
 * drops the usual new-tab/`rel` handling), so callers render a plain anchor
 * instead. Used by `GlobalFeatureOnboardingBody` for its CTA links.
 */
export const isExternalHref = (to: string): boolean => /^https?:\/\//.test(to);
