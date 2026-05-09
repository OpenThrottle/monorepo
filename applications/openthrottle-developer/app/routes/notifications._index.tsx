import * as React from 'react';
import { BellIcon, BellRingIcon } from 'lucide-react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { Separator } from '@openthrottle/react-router-shadcn';
import { EventSubscriptionsSection } from '~/routing/settings/components/EventSubscriptionsSection';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { NotificationPreferencesSection } from '~/routing/settings/components/NotificationPreferencesSection';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/notifications._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Notifications',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `NotificationsIndex | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BellIcon}
          title="Notifications"
        />
        <p className="text-sm text-muted-foreground">
          Choose how we reach you about plans, tasks, and system activity. These
          choices are not saved yet.
        </p>
      </div>
      <NotificationPreferencesSection className="flex-1" />

      <Separator className="my-4" />

      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BellRingIcon}
          title="Event subscriptions"
        />
        <p className="text-sm text-muted-foreground">
          Choose which real-time notification events you want to receive in the
          app. Preferences are saved in this browser and stay in sync if you
          change them in another tab.
        </p>
      </div>
      <EventSubscriptionsSection className="flex-1" />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
