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
  EVENT_SUBSCRIPTION_ROWS,
  type EventSubscriptionId,
} from '~/routing/settings/config/event-subscriptions';
import {
  getEventSubscriptionsFromStorage,
  setEventSubscriptionsInStorage,
  subscribeToEventSubscriptionsStorageEvents,
} from '~/routing/settings/config/event-subscriptions-storage';

/**
 * @description Event subscription toggles persisted in localStorage; see
 * {@link EVENT_SUBSCRIPTION_ROWS}. Server-side filters are not wired yet.
 */
export const EventSubscriptionsSection = () => {
  const [subscribed, setSubscribed] = React.useState(() =>
    getEventSubscriptionsFromStorage(),
  );

  React.useEffect(() => {
    return subscribeToEventSubscriptionsStorageEvents(() => {
      setSubscribed(getEventSubscriptionsFromStorage());
    });
  }, []);

  const handleCheckedChange =
    (id: EventSubscriptionId) => (checked: boolean) => {
      setSubscribed((prev) => {
        const next = { ...prev, [id]: checked };
        setEventSubscriptionsInStorage(next);
        return next;
      });
    };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Event subscriptions</CardTitle>
        <CardDescription>
          Choose which real-time notification events you want to receive in the
          app. Preferences are saved in this browser and stay in sync if you
          change them in another tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        {EVENT_SUBSCRIPTION_ROWS.map((row, index) => (
          <React.Fragment key={row.id}>
            {index > 0 ? <Separator className="my-4" /> : null}
            <div
              className="flex flex-row items-center justify-between gap-4"
              data-testid={`event-subscription-${row.id}`}
            >
              <div className="space-y-1">
                <Label htmlFor={`event-subscription-${row.id}`}>
                  {row.label}
                </Label>
                <p className="font-mono text-xs text-muted-foreground">
                  {row.id}
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.description}
                </p>
              </div>
              <Switch
                aria-label={`Subscribe to ${row.label}`}
                checked={subscribed[row.id]}
                id={`event-subscription-${row.id}`}
                onCheckedChange={handleCheckedChange(row.id)}
              />
            </div>
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
};
