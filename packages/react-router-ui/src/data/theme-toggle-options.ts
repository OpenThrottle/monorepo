/**
 * @description Option list for the OpenThrottleThemeToggle toggle group.
 * Hoisted out of the component per component-primitive-shape R4.
 */

import type { ThemeMode } from '@openthrottle/react-router-utils';
import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from 'lucide-react';

export interface ThemeToggleOption {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: ThemeMode;
}

/** Order matters: light → dark → system, matching the appearance settings. */
export const THEME_TOGGLE_OPTIONS: readonly ThemeToggleOption[] = [
  { icon: SunIcon, label: 'Light', value: 'light' },
  { icon: MoonIcon, label: 'Dark', value: 'dark' },
  { icon: MonitorIcon, label: 'System', value: 'system' },
];
