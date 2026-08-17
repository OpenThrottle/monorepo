import * as React from 'react';
import clsx from 'clsx';
import { useUrlSyncedOverlay } from '@openthrottle/react-router-ui-global';
import { CircleQuestionMarkIcon } from 'lucide-react';
import { SETTINGS_KEYS_COPY } from '~/routing/settings/data/data.copy';
import { SettingsKeysHelpModal } from '~/routing/settings/components/SettingsKeysHelpModal';

export interface SettingsKeysHelpTriggerProps {
  readonly className?: string;
}

/**
 * @description Opens {@link SettingsKeysHelpModal} by setting `modal=keys-help`
 * in the URL (other params preserved). Mirrors `GlobalFeatureOnboardingTrigger`
 * placement in the page header; deliberately does not share React state with
 * the create-credential dialog.
 */
export const SettingsKeysHelpTrigger = (
  props: SettingsKeysHelpTriggerProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const { setOpen } = useUrlSyncedOverlay({
    openValue: SettingsKeysHelpModal.key,
    param: 'modal',
  });

  // Setup

  // Handlers
  const handleClick = React.useCallback((): void => {
    setOpen(true);
  }, [setOpen]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <button
      aria-label={SETTINGS_KEYS_COPY.triggerLabel}
      className={clsx(
        'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors',
        className,
      )}
      data-testid="SettingsKeysHelpTrigger"
      onClick={handleClick}
      type="button"
    >
      <CircleQuestionMarkIcon className="size-4" />
      {SETTINGS_KEYS_COPY.triggerLabel}
    </button>
  );
};
