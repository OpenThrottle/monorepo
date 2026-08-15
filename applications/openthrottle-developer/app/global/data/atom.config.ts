import { isRecord } from '@openthrottle/nodejs-utils';
import { APP_NAME, type ThemeMode } from '@openthrottle/react-router-utils';
import { isThemeId } from '@openthrottle/react-router-shadcn';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

/** localStorage key for persisted appearance preferences. */
export const CONFIG_STORAGE_KEY = `${APP_NAME}:settings:appearance`;

export interface ConfigObject {
  brand: string | undefined;
  theme: ThemeMode;
  /** Selected palette id (`<html data-theme>`); undefined = base theme.css palette. */
  themeId: string | undefined;
}

/**
 * Default = `system` (product-confirmed): the app follows the OS color scheme
 * out of the box. Existing users keep their persisted value via
 * {@link normalizeAppearanceConfig}.
 */
export const DEFAULT_APPEARANCE_CONFIG: ConfigObject = {
  brand: undefined,
  theme: 'system',
  themeId: undefined,
};

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'dark' || value === 'light' || value === 'system';

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

  const themeId =
    typeof record.themeId === 'string' && isValidThemeId(record.themeId)
      ? record.themeId
      : undefined;

  return { brand, theme, themeId };
};

const createAppearanceConfigStorage = (): SyncStorage<ConfigObject> => {
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

export const configAtom = atomWithStorage(
  CONFIG_STORAGE_KEY,
  DEFAULT_APPEARANCE_CONFIG,
  createAppearanceConfigStorage(),
  { getOnInit: true },
);
