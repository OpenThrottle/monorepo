import {
  Label,
  OPENTHROTTLE_THEME,
  THEMES,
} from '@openthrottle/react-router-shadcn';
import {
  resolveThemeMode,
  useResolvedThemeMode,
} from '@openthrottle/react-router-utils';
import { useAtomValue } from 'jotai';
import * as React from 'react';

import { configAtom } from '~/global/data/data.atom-config';
import { useHydratedAppearanceConfig } from '~/global/hooks/useHydratedAppearanceConfig';
import { AppearancePaletteSwatch } from '~/routing/settings/components/AppearancePaletteSwatch';
import { THEME_DEFAULT_OPTION } from '~/routing/settings/config/appearance';
import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

export interface AppearancePaletteFieldProps {}

/**
 * @description Palette picker for Settings → Appearance. Owns the `themeId`
 * slice of the shared appearance `configAtom`, mapping the `THEME_DEFAULT_OPTION`
 * sentinel back to `undefined` (no palette). The resolved light/dark mode is
 * computed once here and passed down, so the grid holds one `matchMedia`
 * subscription rather than one per tile.
 *
 * Until hydration completes the grid renders exactly what the server did — the
 * default config with no OS preference — so every tile's inline
 * `backgroundColor` and the selected tile match the server markup.
 */
export const AppearancePaletteField = (
  _props: AppearancePaletteFieldProps,
): React.ReactElement => {
  // Hooks
  const { config, isHydrated, setConfig } = useHydratedAppearanceConfig();
  // The stored theme, not the hydration-gated one: this hook also toggles the
  // document's `.dark` class, which must never flip to the default for a frame.
  const storedTheme = useAtomValue(configAtom).theme;
  const resolvedMode = useResolvedThemeMode(storedTheme);

  // Setup
  // `matchMedia` is client-only too: until hydrated, resolve the way the
  // server did (no OS preference).
  const swatchMode = isHydrated
    ? resolvedMode
    : resolveThemeMode(config.theme, false);
  const selectedValue = config.themeId ?? THEME_DEFAULT_OPTION;

  // Handlers
  const handleSelect = (value: string): void => {
    setConfig({
      ...config,
      themeId: value === THEME_DEFAULT_OPTION ? undefined : value,
    });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="AppearancePaletteField">
      <Label>{APPEARANCE_COPY.paletteLabel}</Label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AppearancePaletteSwatch
          isSelected={selectedValue === THEME_DEFAULT_OPTION}
          label={APPEARANCE_COPY.paletteDefaultOptionLabel}
          mode={swatchMode}
          onSelect={handleSelect}
          theme={OPENTHROTTLE_THEME}
          value={THEME_DEFAULT_OPTION}
        />
        {THEMES.map((theme) => (
          <AppearancePaletteSwatch
            isSelected={selectedValue === theme.id}
            key={theme.id}
            mode={swatchMode}
            onSelect={handleSelect}
            theme={theme}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        {APPEARANCE_COPY.paletteHelp}
      </p>
    </div>
  );
};
