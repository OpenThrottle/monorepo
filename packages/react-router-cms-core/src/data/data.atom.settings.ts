import { atom } from 'jotai';

import type { CmsDevice } from '../config/cms-device';
import { CMS_DEVICE } from '../config/cms-device';

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
