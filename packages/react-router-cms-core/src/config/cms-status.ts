/**
 * @description Lifecycle status shared by CMS layouts and schemas.
 * @public
 */
export const CMS_STATUS = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  DRAFT: 'DRAFT',
} as const;

export type CmsStatusKey = keyof typeof CMS_STATUS;
/**
 * @public
 */
export type CmsStatusValue = (typeof CMS_STATUS)[CmsStatusKey];
