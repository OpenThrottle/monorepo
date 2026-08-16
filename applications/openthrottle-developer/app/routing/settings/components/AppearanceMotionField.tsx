import * as React from 'react';
import {
  Label,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { useAtom } from 'jotai';
import { configAtom, isReducedMotionMode } from '~/global/data/atom.config';
import { APPEARANCE_MOTION_OPTIONS } from '~/routing/settings/data/data.appearance';
import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

export interface AppearanceMotionFieldProps {}

/**
 * @description Motion preference for Settings → Appearance. Owns the
 * `reducedMotion` slice of the shared appearance `configAtom`. `system` defers
 * to `prefers-reduced-motion`; `always` suppresses decorative animation whatever
 * the OS reports.
 */
export const AppearanceMotionField = (
  _props: AppearanceMotionFieldProps,
): React.ReactElement => {
  // Hooks
  const [config, setConfig] = useAtom(configAtom);

  // Setup

  // Handlers
  // Radix single-toggle deselect emits an empty string; ignore it so the
  // selection can never be cleared, matching OpenThrottleThemeToggle.
  const handleValueChange = (next: string): void => {
    if (isReducedMotionMode(next)) {
      setConfig({ ...config, reducedMotion: next });
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="AppearanceMotionField">
      <Label>{APPEARANCE_COPY.motionLabel}</Label>
      <ToggleGroup
        aria-label={APPEARANCE_COPY.motionToggleAriaLabel}
        onValueChange={handleValueChange}
        size="sm"
        type="single"
        value={config.reducedMotion}
        variant="outline"
      >
        {APPEARANCE_MOTION_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <ToggleGroupItem
              aria-label={option.label}
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
      <p className="text-muted-foreground text-sm">
        {APPEARANCE_COPY.motionHelp}
      </p>
    </div>
  );
};
