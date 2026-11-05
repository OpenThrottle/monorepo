import { Button, Label, Switch } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { NotificationPermissionState } from '../types';
import type { SystemNotificationsPreference } from '../utils/system-notification';
import { NotificationPermissionDenied } from './NotificationPermissionDenied';
import { NotificationPermissionUnsupported } from './NotificationPermissionUnsupported';

export interface NotificationSystemPreferencesProps {
  readonly permission: NotificationPermissionState;
  readonly preference: SystemNotificationsPreference;
  readonly requestPermission: () => Promise<NotificationPermissionState>;
  readonly setPreference: (pref: SystemNotificationsPreference) => void;
}

/**
 * @description Desktop-notification section of the bell dropdown: permission
 * prompts or blocked/unsupported notices, then the enable and
 * "only when background" toggles once permission is granted.
 *
 * @public
 */
export const NotificationSystemPreferences = (
  props: NotificationSystemPreferencesProps,
): React.ReactElement => {
  const { permission, preference, requestPermission, setPreference } = props;

  // Hooks
  const [requesting, setRequesting] = React.useState(false);

  // Setup
  const idleLabel = 'Enable desktop notifications';
  const requestLabel = requesting ? 'Requesting…' : idleLabel;

  // Handlers
  const handleEnabledChange = (checked: boolean): void => {
    const { onlyWhenBackground } = preference;

    setPreference({
      ...preference,
      enabled: checked,
      onlyWhenBackground: checked ? onlyWhenBackground : undefined,
    });
  };

  // Markup
  const permissionPrompt = (
    <div className="space-y-2">
      <Button
        className="w-full"
        data-testid="notification-bell-enable-desktop"
        disabled={requesting}
        onClick={async () => {
          setRequesting(true);
          await requestPermission();
          setRequesting(false);
        }}
        size="sm"
        variant="secondary"
      >
        {requestLabel}
      </Button>
      <p className="text-muted-foreground text-xs">
        Allow in the browser prompt to receive notifications when the tab is in
        the background.
      </p>
    </div>
  );
  const onlyBackgroundRow = (
    <div className="flex items-center justify-between gap-2 pl-1">
      <Label
        className="text-muted-foreground cursor-pointer text-sm font-normal"
        htmlFor="system-notifications-only-background"
      >
        Only when tab in background
      </Label>
      <Switch
        checked={preference.onlyWhenBackground === true}
        id="system-notifications-only-background"
        onCheckedChange={(checked) =>
          setPreference({
            ...preference,
            onlyWhenBackground: checked === true ? true : undefined,
          })
        }
      />
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (permission === 'unsupported') {
    return <NotificationPermissionUnsupported />;
  }

  if (permission === 'denied') {
    return <NotificationPermissionDenied />;
  }

  if (permission === 'default') {
    return permissionPrompt;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Label
          className="cursor-pointer text-sm font-normal"
          htmlFor="system-notifications-enabled"
        >
          Desktop notifications
        </Label>
        <Switch
          checked={preference.enabled}
          id="system-notifications-enabled"
          onCheckedChange={handleEnabledChange}
        />
      </div>
      {preference.enabled ? onlyBackgroundRow : null}
    </>
  );
};
