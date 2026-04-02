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
  buildInitialSubscriptions,
  EVENT_SUBSCRIPTION_ROWS,
  type EventSubscriptionId,
} from '~/routing/settings/config/event-subscriptions';

/**
 * @description Placeholder event subscription panel. Local state only until
 * subscription persistence and server-side filters exist — see {@link EVENT_SUBSCRIPTION_ROWS}.
 */
export const EventSubscriptionsSection = () => {
  const [subscribed, setSubscribed] = React.useState(buildInitialSubscriptions);

  const handleCheckedChange =
    (id: EventSubscriptionId) => (checked: boolean) => {
      console.log('🟢 8 - handleCheckedChange', id, checked);

      setSubscribed((prev) => ({ ...prev, [id]: checked }));
    };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Event subscriptions</CardTitle>
        <CardDescription>
          Choose which real-time notification events you want to receive in the
          app. Subscriptions are not saved yet.
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
