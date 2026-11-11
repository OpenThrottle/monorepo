/**
 * @description Viewport the CMS editor previews a layout at.
 * @public
 */
export const CMS_DEVICE = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
} as const;

/**
 * @public
 */
export type CmsDevice = (typeof CMS_DEVICE)[keyof typeof CMS_DEVICE];
