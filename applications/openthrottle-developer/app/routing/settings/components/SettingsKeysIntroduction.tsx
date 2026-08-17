import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { KeyRoundIcon } from 'lucide-react';
import { SETTINGS_KEYS_COPY } from '~/routing/settings/data/data.copy';
import { SettingsKeysHelpModal } from '~/routing/settings/components/SettingsKeysHelpModal';
import { SettingsKeysHelpTrigger } from '~/routing/settings/components/SettingsKeysHelpTrigger';

export interface SettingsKeysIntroductionProps {
  className?: string;
}

/**
 * @description Page header for Settings → Keys: the heading, the long-lived
 * bearer-token intro, and the trigger that opens the operational help in
 * {@link SettingsKeysHelpModal} (`?modal=keys-help`).
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
        <SettingsKeysHelpTrigger />
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

      <SettingsKeysHelpModal />
    </div>
  );
};
