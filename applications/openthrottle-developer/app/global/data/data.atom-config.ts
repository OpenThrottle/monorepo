import { atomWithStorage } from 'jotai/utils';

import {
  CONFIG_STORAGE_KEY,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/data.appearance-config';
import { createAppearanceConfigStorage } from '~/global/utils/appearance-config';

export const configAtom = atomWithStorage(
  CONFIG_STORAGE_KEY,
  DEFAULT_APPEARANCE_CONFIG,
  createAppearanceConfigStorage(),
  { getOnInit: true },
);
