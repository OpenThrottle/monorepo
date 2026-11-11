import type { CmsDevice } from '../config/cms-device';

/**
 * @description The frame each preview device gets. Sizes follow the iPhone 14 (390×844) and
 * iPad Air (820×1180) CSS viewports.
 * @link https://www.appmysite.com/blog/the-complete-guide-to-iphone-screen-resolutions-and-sizes/
 * @public
 */
export const PREVIEW_DEVICE_CLASS_NAMES: Readonly<Record<CmsDevice, string>> = {
  desktop: 'w-full border-transparent',
  mobile: 'mt-8 h-[844px] w-[390px] rounded-md',
  tablet: 'mt-8 h-[1180px] w-[820px] rounded-md',
};
