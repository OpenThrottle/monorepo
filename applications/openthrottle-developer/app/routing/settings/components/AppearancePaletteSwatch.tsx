import * as React from 'react';
import type { Theme } from '@openthrottle/react-router-shadcn';
import type { ResolvedThemeMode } from '@openthrottle/react-router-utils';
import clsx from 'clsx';
import { APPEARANCE_SWATCH_TOKEN_NAMES } from '~/routing/settings/data/data.appearance';

export interface AppearancePaletteSwatchProps {
  isSelected: boolean;
  /** Overrides `theme.label`, for the leading "no palette" tile. */
  label?: string;
  /** Which of the theme's two token records to draw the chips from. */
  mode: ResolvedThemeMode;
  onSelect: (themeId: string) => void;
  theme: Theme;
  /** Value handed to `onSelect`; defaults to `theme.id`. */
  value?: string;
}

/**
 * @description One palette tile in the Settings → Appearance swatch grid. Chips
 * are inline colors read from the theme's own token record rather than live CSS
 * variables — unselected palettes are never applied to the document, so there is
 * nothing to read from `getComputedStyle`.
 */
export const AppearancePaletteSwatch = (
  props: AppearancePaletteSwatchProps,
): React.ReactElement => {
  const { isSelected, label, mode, onSelect, theme, value } = props;

  // Hooks

  // Setup
  const tokens = mode === 'dark' ? theme.dark : theme.light;
  const selectionValue = value ?? theme.id;

  // Handlers
  const handleClick = (): void => {
    onSelect(selectionValue);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <button
      aria-pressed={isSelected}
      className={clsx(
        'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
        'hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        isSelected && 'ring-ring border-ring ring-2',
      )}
      data-testid="AppearancePaletteSwatch"
      data-theme-id={selectionValue}
      onClick={handleClick}
      type="button"
    >
      <span
        aria-hidden={true}
        className="flex overflow-hidden rounded-md border"
      >
        {APPEARANCE_SWATCH_TOKEN_NAMES.map((token) => (
          <span
            className="h-6 flex-1"
            key={token}
            style={{ backgroundColor: tokens[token] }}
          />
        ))}
      </span>
      <span className="truncate text-sm font-medium">
        {label ?? theme.label}
      </span>
    </button>
  );
};
