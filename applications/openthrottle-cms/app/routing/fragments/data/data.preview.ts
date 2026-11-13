import type { CmsDevice } from '@openthrottle/react-router-cms-core';
import { CMS_DEVICE } from '@openthrottle/react-router-cms-core';
import type { LucideIcon } from 'lucide-react';
import { MonitorIcon, SmartphoneIcon, TabletIcon } from 'lucide-react';

import { FRAGMENT_PREVIEW_COPY } from '~/routing/fragments/data/data.copy';

/**
 * @description One choice in the preview's device toggle.
 */
export interface FragmentPreviewDevice {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: CmsDevice;
}

/**
 * @description The preview's device toggle, widest first.
 */
export const FRAGMENT_PREVIEW_DEVICES: readonly FragmentPreviewDevice[] = [
  {
    icon: MonitorIcon,
    label: FRAGMENT_PREVIEW_COPY.desktop,
    value: CMS_DEVICE.DESKTOP,
  },
  {
    icon: TabletIcon,
    label: FRAGMENT_PREVIEW_COPY.tablet,
    value: CMS_DEVICE.TABLET,
  },
  {
    icon: SmartphoneIcon,
    label: FRAGMENT_PREVIEW_COPY.mobile,
    value: CMS_DEVICE.MOBILE,
  },
];
