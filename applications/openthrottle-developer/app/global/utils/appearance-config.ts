import { isRecord } from '@openthrottle/nodejs-utils';
import { isThemeId } from '@openthrottle/react-router-shadcn';
import type { ThemeMode } from '@openthrottle/react-router-utils';
import { createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

import type {
  ConfigObject,
  ReducedMotionMode,
} from '~/global/data/data.appearance-config';
import {
  DEFAULT_APPEARANCE_CONFIG,
  REDUCED_MOTION_MODES,
} from '~/global/data/data.appearance-config';

const isThemeMode = (value: unknown): value is ThemeMode => {
  return value === 'dark' || value === 'light' || value === 'system';
};

/** Type guard for persisted / toggle-emitted motion values. */
export const isReducedMotionMode = (
  value: unknown,
): value is ReducedMotionMode => {
  return (
    value === REDUCED_MOTION_MODES.always ||
    value === REDUCED_MOTION_MODES.system
  );
};

const pickReducedMotionMode = (value: unknown): ReducedMotionMode => {
  if (isReducedMotionMode(value)) {
    return value;
  }
  return DEFAULT_APPEARANCE_CONFIG.reducedMotion;
};

const pickThemeId = (
  value: unknown,
  isValidThemeId: (themeId: unknown) => boolean,
): string | undefined => {
  if (typeof value === 'string' && isValidThemeId(value)) {
    return value;
  }
  return undefined;
};

/**
 * @description Coerce unknown persisted JSON into a valid {@link ConfigObject}.
 * Migrates legacy `accentColor` to `brand`. The `themeId` palette check is
 * pluggable (`isValidThemeId`, defaulting to shadcn's {@link isThemeId}) so the
 * shape logic carries no hard shadcn dependency and could move to a shared home
 * later.
 */
export const normalizeAppearanceConfig = (
  value: unknown,
  isValidThemeId: (themeId: unknown) => boolean = isThemeId,
): ConfigObject => {
  if (!isRecord(value)) {
    return DEFAULT_APPEARANCE_CONFIG;
  }

  const record = value;
  const theme = isThemeMode(record.theme)
    ? record.theme
    : DEFAULT_APPEARANCE_CONFIG.theme;

  let brand: string | undefined;
  if (typeof record.brand === 'string') {
    brand = record.brand;
  } else if (typeof record.accentColor === 'string') {
    brand = record.accentColor;
  } else {
    brand = undefined;
  }

  const themeId = pickThemeId(record.themeId, isValidThemeId);

  // Payloads persisted before the motion preference existed have no
  // `reducedMotion` key; they migrate to the default rather than being discarded.
  const reducedMotion = pickReducedMotionMode(record.reducedMotion);

  return { brand, reducedMotion, theme, themeId };
};

/** @description JSON localStorage adapter that normalizes whatever it reads. */
export const createAppearanceConfigStorage = (): SyncStorage<ConfigObject> => {
  const jsonStorage = createJSONStorage<ConfigObject>(() => {
    if (typeof window === 'undefined') {
      return {
        getItem: () => null,
        removeItem: () => {},
        setItem: () => {},
        subscribe: () => () => {},
      };
    }
    return localStorage;
  });

  return {
    ...jsonStorage,
    getItem: (key, initialValue) => {
      const raw = jsonStorage.getItem(key, initialValue);
      return normalizeAppearanceConfig(raw);
    },
  };
};
