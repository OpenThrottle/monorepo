/**
 * @description Viewport the CMS editor previews a layout at.
 * @public
 */
export const CMS_DEVICE = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
} as const;

export type CmsDeviceKey = keyof typeof CMS_DEVICE;
/**
 * @public
 */
export type CmsDeviceValue = (typeof CMS_DEVICE)[CmsDeviceKey];
