import * as React from 'react';
import classnames from 'classnames';
import {
  Label,
  Separator,
  Switch,
  toast,
} from '@openthrottle/react-router-shadcn';
import { NOTIFICATION_PREFERENCE_ROWS } from '~/routing/settings/config/notification-preferences';
import type { NotificationPreferenceId } from '~/routing/settings/config/notification-preferences';
import { getDefaultNotificationSettings } from '~/routing/settings/utils/parsers';

export interface NotificationPreferencesSectionProps {
  className?: string;
}

/**
 * @description Placeholder notification preferences panel. Local state only until
 * user settings API and action handlers exist — see {@link NOTIFICATION_PREFERENCE_ROWS}.
 */
export const NotificationPreferencesSection = (
  props: NotificationPreferencesSectionProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const [toggles, setToggles] = React.useState(() =>
    getDefaultNotificationSettings(),
  );

  // Setup

  // Handlers
  const handleCheckedChange =
    (id: NotificationPreferenceId) => (checked: boolean) => {
      setToggles((prev) => ({ ...prev, [id]: checked }));

      const value = toast.loading('Start a loader...');

      setTimeout(() => {
        toast.dismiss(value);
      }, 1_500);
    };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div
        className={classnames(
          'space-y-0 bg-card rounded-lg border border-card-border p-4',
          className,
        )}
      >
        {NOTIFICATION_PREFERENCE_ROWS.map((row, index) => (
          <React.Fragment key={row.id}>
            {index > 0 ? <Separator className="my-4" /> : null}
            <div
              className="flex flex-row items-center justify-between gap-4"
              data-testid={`notification-pref-${row.id}`}
            >
              <div className="space-y-1">
                <Label htmlFor={`notification-pref-${row.id}`}>
                  {row.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {row.description}
                </p>
              </div>
              <Switch
                aria-label={row.label}
                checked={toggles[row.id]}
                id={`notification-pref-${row.id}`}
                onCheckedChange={handleCheckedChange(row.id)}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </>
  );
};
