import { atom } from 'jotai';

import type { CmsDevice } from '../config';
import { CMS_DEVICE } from '../config';

/**
 * @description Editor chrome preferences.
 * @public
 */
export interface AtomSettings {
  readonly device: CmsDevice;
  readonly navigation: AtomSettingsNavigation;
}

/**
 * @public
 */
export interface AtomSettingsNavigation {
  readonly open: boolean;
}

/**
 * @public
 */
export const atomSettingsDefault: AtomSettings = {
  device: CMS_DEVICE.DESKTOP,
  navigation: {
    open: true,
  },
};

/**
 * @public
 */
export const atomSettings = atom<AtomSettings>(atomSettingsDefault);
