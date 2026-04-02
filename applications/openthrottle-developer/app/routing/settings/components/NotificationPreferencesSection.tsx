import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Separator,
  Switch,
} from '@openthrottle/react-router-shadcn';
import {
  NOTIFICATION_PREFERENCE_ROWS,
  type NotificationPreferenceId,
} from '~/routing/settings/config/notification-preferences';

const buildInitialToggles = (): Record<NotificationPreferenceId, boolean> => {
  const next: Record<NotificationPreferenceId, boolean> = {
    assignments: false,
    pullRequests: false,
    queues: false,
    weeklyDigest: false,
  };
  for (const row of NOTIFICATION_PREFERENCE_ROWS) {
    next[row.id] = row.defaultEnabled;
  }
  return next;
};

/**
 * @description Placeholder notification preferences panel. Local state only until
 * user settings API and action handlers exist — see {@link NOTIFICATION_PREFERENCE_ROWS}.
 */
export const NotificationPreferencesSection = () => {
  const [toggles, setToggles] = React.useState(buildInitialToggles);

  const handleCheckedChange =
    (id: NotificationPreferenceId) => (checked: boolean) => {
      setToggles((prev) => ({ ...prev, [id]: checked }));
    };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose how we reach you about plans, tasks, and system activity. These
          choices are not saved yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
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
      </CardContent>
    </Card>
  );
};
