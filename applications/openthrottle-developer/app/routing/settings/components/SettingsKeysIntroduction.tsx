import * as React from 'react';
import {
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
import { KeyRoundIcon } from 'lucide-react';
import { SETTINGS_KEYS_COPY } from '~/routing/settings/data/data.copy';

export interface SettingsKeysIntroductionProps {
  className?: string;
}

/**
 * @description Page header for Settings → Keys: the heading, the long-lived
 * bearer-token intro, and the shared onboarding trigger. The operational help
 * lives in the route-level `GlobalFeatureOnboardingModal` fed by
 * `SETTINGS_KEYS_ONBOARDING` (`?modal=onboarding`).
 */
export const SettingsKeysIntroduction = (
  props: SettingsKeysIntroductionProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="SettingsKeysIntroduction">
      <div className="mb-4 flex items-center justify-between">
        <GlobalHeading
          heading="h1"
          icon={KeyRoundIcon}
          title={SETTINGS_KEYS_COPY.title}
        />
        <GlobalFeatureOnboardingTrigger />
      </div>

      <p className="text-muted-foreground text-sm">
        {SETTINGS_KEYS_COPY.introPrefix}
        <code className="text-xs">{SETTINGS_KEYS_COPY.introTokenCode}</code>
        {SETTINGS_KEYS_COPY.introMiddle}
        <code className="text-xs">
          {SETTINGS_KEYS_COPY.introAuthorizationCode}
        </code>
        {SETTINGS_KEYS_COPY.introSuffix}
      </p>
    </div>
  );
};
