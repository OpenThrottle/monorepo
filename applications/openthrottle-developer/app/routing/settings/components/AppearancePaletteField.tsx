import * as React from 'react';
import {
  Label,
  OPENTHROTTLE_THEME,
  THEMES,
} from '@openthrottle/react-router-shadcn';
import { useAtom } from 'jotai';
import { useResolvedThemeMode } from '@openthrottle/react-router-utils';
import { configAtom } from '~/global/data/atom.config';
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
 */
export const AppearancePaletteField = (
  _props: AppearancePaletteFieldProps,
): React.ReactElement => {
  // Hooks
  const [config, setConfig] = useAtom(configAtom);
  const resolvedMode = useResolvedThemeMode(config.theme);

  // Setup
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
          mode={resolvedMode}
          onSelect={handleSelect}
          theme={OPENTHROTTLE_THEME}
          value={THEME_DEFAULT_OPTION}
        />
        {THEMES.map((theme) => (
          <AppearancePaletteSwatch
            isSelected={selectedValue === theme.id}
            key={theme.id}
            mode={resolvedMode}
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
