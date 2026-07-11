import * as React from 'react';
import {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupProps,
} from '@openthrottle/react-router-shadcn';
import { isThemeMode, type ThemeMode } from '@openthrottle/react-router-utils';
import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from 'lucide-react';

export interface OpenThrottleThemeToggleProps {
  /** Accessible label for the toggle group. Defaults to `Color mode`. */
  ariaLabel?: string;
  className?: string;
  /**
   * Fired with a valid {@link ThemeMode} when the selection changes. The app
   * owns the state (jotai / storage) and passes it back in via {@link value};
   * this component is fully controlled and holds no state of its own.
   */
  onValueChange: (mode: ThemeMode) => void;
  /** Toggle item size, forwarded to the shadcn ToggleGroup. Defaults to `sm`. */
  size?: ToggleGroupProps['size'];
  /** Currently selected color mode. */
  value: ThemeMode;
}

interface ThemeToggleOption {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: ThemeMode;
}

/** Order matters: light → dark → system, matching the appearance settings. */
const THEME_TOGGLE_OPTIONS: readonly ThemeToggleOption[] = [
  { icon: SunIcon, label: 'Light', value: 'light' },
  { icon: MoonIcon, label: 'Dark', value: 'dark' },
  { icon: MonitorIcon, label: 'System', value: 'system' },
];

/**
 * @public
 * @description Controlled light / dark / system color-mode toggle shared across
 * OpenThrottle React Router apps. Built on the shadcn {@link ToggleGroup}; emits
 * only valid {@link ThemeMode} values (Radix single-toggle deselect sends an
 * empty string, which is ignored so the selection can never be cleared).
 */
export const OpenThrottleThemeToggle = (
  props: OpenThrottleThemeToggleProps,
): React.ReactElement => {
  const {
    ariaLabel = 'Color mode',
    className,
    onValueChange,
    size = 'sm',
    value,
  } = props;

  // Hooks

  // Setup

  // Handlers
  const handleValueChange = (next: string): void => {
    if (isThemeMode(next)) {
      onValueChange(next);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ToggleGroup
      aria-label={ariaLabel}
      className={className}
      data-testid="OpenThrottleThemeToggle"
      onValueChange={handleValueChange}
      size={size}
      type="single"
      value={value}
      variant="outline"
    >
      {THEME_TOGGLE_OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <ToggleGroupItem
            aria-label={`${option.label} mode`}
            className="gap-1.5 px-2.5"
            key={option.value}
            value={option.value}
          >
            <Icon aria-hidden={true} className="size-4" />
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
};
