import type { CMS_STATUS } from './config.constants.ts';

/**
 * @description A cms row's lifecycle status: one of {@link CMS_STATUS}.
 * @public
 */
export type CmsStatus = (typeof CMS_STATUS)[keyof typeof CMS_STATUS];
