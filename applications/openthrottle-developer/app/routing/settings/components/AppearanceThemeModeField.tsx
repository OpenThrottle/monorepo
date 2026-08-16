import * as React from 'react';
import { Label } from '@openthrottle/react-router-shadcn';
import { OpenThrottleThemeToggle } from '@openthrottle/react-router-ui';
import { useAtom } from 'jotai';
import type { ThemeMode } from '@openthrottle/react-router-utils';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

export interface AppearanceThemeModeFieldProps {}

/**
 * @description System / Light / Dark toggle for Settings → Appearance. Owns the
 * `theme` slice of the shared appearance `configAtom` and nothing else.
 */
export const AppearanceThemeModeField = (
  _props: AppearanceThemeModeFieldProps,
): React.ReactElement => {
  // Hooks
  const [config, setConfig] = useAtom(configAtom);

  // Setup

  // Handlers
  const handleThemeChange = (theme: ThemeMode): void => {
    setConfig({ ...config, theme });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="AppearanceThemeModeField">
      <Label>{APPEARANCE_COPY.themeLabel}</Label>
      <OpenThrottleThemeToggle
        onValueChange={handleThemeChange}
        value={config.theme}
      />
      <p className="text-muted-foreground text-sm">
        {APPEARANCE_COPY.themeHelpPrefix}
        {DEFAULT_APPEARANCE_CONFIG.theme}
        {APPEARANCE_COPY.themeHelpSuffix}
      </p>
    </div>
  );
};
