/**
 * @description Lifecycle status shared by CMS layouts and schemas.
 * @public
 */
export const CMS_STATUS = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  DRAFT: 'DRAFT',
} as const;

/**
 * @public
 */
export type CmsStatus = (typeof CMS_STATUS)[keyof typeof CMS_STATUS];
