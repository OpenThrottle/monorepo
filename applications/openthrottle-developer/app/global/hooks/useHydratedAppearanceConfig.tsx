import { useIsHydrated } from '@openthrottle/react-router-utils';
import { useAtom } from 'jotai';

import type { ConfigObject } from '~/global/data/data.appearance-config';
import { DEFAULT_APPEARANCE_CONFIG } from '~/global/data/data.appearance-config';
import { configAtom } from '~/global/data/data.atom-config';

export interface UseHydratedAppearanceConfigResult {
  /** The stored config once hydrated; {@link DEFAULT_APPEARANCE_CONFIG} before. */
  readonly config: ConfigObject;
  readonly isHydrated: boolean;
  readonly setConfig: (config: ConfigObject) => void;
}

/**
 * @description The appearance `configAtom` for anything that renders it. The
 * atom reads localStorage on init, which the server cannot, so during the
 * server render and the hydration pass this returns the default config — the
 * same values the server rendered — and the stored config from the next render
 * on. Reading the atom directly made Settings → Appearance controls (selected
 * palette, color mode, reset button) differ from the server markup, and React
 * leaves mismatched attributes unpatched.
 */
export const useHydratedAppearanceConfig =
  (): UseHydratedAppearanceConfigResult => {
    // Hooks
    const [storedConfig, setConfig] = useAtom(configAtom);
    const isHydrated = useIsHydrated();

    // Setup
    const config = isHydrated ? storedConfig : DEFAULT_APPEARANCE_CONFIG;

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return { config, isHydrated, setConfig };
  };
