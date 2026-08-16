import type * as React from 'react';
import type { ThemeTokenName } from '@openthrottle/react-router-shadcn';
import { GaugeIcon, MonitorIcon, type LucideIcon } from 'lucide-react';
import {
  REDUCED_MOTION_MODES,
  type ReducedMotionMode,
} from '~/global/data/atom.config';
import { AppearanceBrandColorField } from '~/routing/settings/components/AppearanceBrandColorField';
import { AppearanceMotionField } from '~/routing/settings/components/AppearanceMotionField';
import { AppearancePaletteField } from '~/routing/settings/components/AppearancePaletteField';
import { AppearanceResetField } from '~/routing/settings/components/AppearanceResetField';
import { AppearanceThemeModeField } from '~/routing/settings/components/AppearanceThemeModeField';
import { SettingsOnboardingRestore } from '~/routing/settings/components/SettingsOnboardingRestore';
import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

/**
 * The tokens each palette tile shows, in chip order: page ground, the two
 * accent-bearing tokens, a chart hue, and the sidebar accent. Enough to tell two
 * palettes apart at a glance without turning the tile into a token dump.
 */
export const APPEARANCE_SWATCH_TOKEN_NAMES: readonly ThemeTokenName[] = [
  'background',
  'primary',
  'accent',
  'chart-1',
  'sidebar-primary',
];

/**
 * Stable ids for the Settings → Appearance groups (`data-section-id`). Module
 * -local: consumers read ids off `APPEARANCE_SECTIONS` rather than this map, so
 * exporting it would just be dead API surface.
 */
const APPEARANCE_SECTION_IDS = {
  colorScheme: 'color-scheme',
  guides: 'guides',
  motion: 'motion',
  palette: 'palette',
} as const;

export interface AppearanceSectionEntry {
  /**
   * Controls rendered inside the section, in order. A group may own more than
   * one field (Palette owns both the palette picker and the brand override).
   */
  readonly Components: readonly React.ComponentType[];
  readonly description: string;
  readonly id: string;
  readonly title: string;
}

/**
 * @description The ordered Settings → Appearance groups. `AppearancePanel`
 * renders this array and nothing else, so reordering a group is moving an entry,
 * removing one is deleting an entry, and adding one is appending an entry — no
 * JSX edits either way.
 */
export const APPEARANCE_SECTIONS: readonly AppearanceSectionEntry[] = [
  {
    Components: [AppearanceThemeModeField],
    description: APPEARANCE_COPY.sectionColorSchemeDescription,
    id: APPEARANCE_SECTION_IDS.colorScheme,
    title: APPEARANCE_COPY.sectionColorSchemeTitle,
  },
  {
    Components: [AppearancePaletteField, AppearanceBrandColorField],
    description: APPEARANCE_COPY.sectionPaletteDescription,
    id: APPEARANCE_SECTION_IDS.palette,
    title: APPEARANCE_COPY.sectionPaletteTitle,
  },
  {
    Components: [AppearanceMotionField],
    description: APPEARANCE_COPY.sectionMotionDescription,
    id: APPEARANCE_SECTION_IDS.motion,
    title: APPEARANCE_COPY.sectionMotionTitle,
  },
  {
    Components: [SettingsOnboardingRestore, AppearanceResetField],
    description: APPEARANCE_COPY.sectionGuidesDescription,
    id: APPEARANCE_SECTION_IDS.guides,
    title: APPEARANCE_COPY.sectionGuidesTitle,
  },
];

/**
 * Chart-token utility classes shown as chips in the appearance preview. Real
 * Tailwind classes (not interpolated) so the JIT compiler keeps them.
 */
export const APPEARANCE_PREVIEW_CHART_CLASSES: readonly string[] = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
];

export interface AppearanceMotionOption {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: ReducedMotionMode;
}

/** Options for the motion toggle group, mirroring the theme toggle's shape. */
export const APPEARANCE_MOTION_OPTIONS: readonly AppearanceMotionOption[] = [
  {
    icon: MonitorIcon,
    label: APPEARANCE_COPY.motionSystemLabel,
    value: REDUCED_MOTION_MODES.system,
  },
  {
    icon: GaugeIcon,
    label: APPEARANCE_COPY.motionAlwaysLabel,
    value: REDUCED_MOTION_MODES.always,
  },
];
