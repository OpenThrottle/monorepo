import * as React from 'react';
import classnames from 'classnames';
import { Label, Separator, Switch } from '@openthrottle/react-router-shadcn';
import {
  EVENT_SUBSCRIPTION_ROWS,
  type EventSubscriptionId,
} from '~/routing/settings/config/event-subscriptions';
import {
  getEventSubscriptionsFromStorage,
  setEventSubscriptionsInStorage,
  subscribeToEventSubscriptionsStorageEvents,
} from '~/routing/settings/config/event-subscriptions-storage';

export interface EventSubscriptionsSectionProps {
  readonly className?: string;
}

/**
 * @description Event subscription toggles persisted in localStorage; see
 * {@link EVENT_SUBSCRIPTION_ROWS}. Server-side filters are not wired yet.
 */
export const EventSubscriptionsSection = (
  props: EventSubscriptionsSectionProps,
) => {
  const { className } = props;

  // Hooks
  const [subscribed, setSubscribed] = React.useState(() =>
    getEventSubscriptionsFromStorage(),
  );

  // Setup

  // Handlers
  const handleCheckedChange =
    (id: EventSubscriptionId) => (checked: boolean) => {
      setSubscribed((prev) => {
        const next = { ...prev, [id]: checked };
        setEventSubscriptionsInStorage(next);
        return next;
      });
    };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    return subscribeToEventSubscriptionsStorageEvents(() => {
      setSubscribed(getEventSubscriptionsFromStorage());
    });

    // 🪝 On mount we set up our subscription(s)
  }, []);

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'space-y-0 bg-card rounded-lg border border-card-border p-4',
        className,
      )}
    >
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
              {/* <p className="font-mono text-xs text-muted-foreground">
                  {row.id}
                </p> */}
              <p className="text-sm text-muted-foreground">{row.description}</p>
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
    </div>
  );
};
