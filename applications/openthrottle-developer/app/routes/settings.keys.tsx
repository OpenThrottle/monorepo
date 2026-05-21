import * as React from 'react';
import { KeyRoundIcon } from 'lucide-react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import type { Route } from '@/app/routes/+types/settings.keys';
import { SettingsKeysIntroduction } from '~/routing/settings/components/SettingsKeysIntroduction';
import { SettingsKeysToolbar } from '~/routing/settings/components/SettingsKeysToolbar';
import { SettingsKeysTable } from '~/routing/settings/components/SettingsKeysTable';
import { SettingsKeysForm } from '~/routing/settings/components/SettingsKeysForm';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'SettingsKeys',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `SettingsKeys | ${SITE_TITLE}` }];
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
          icon={KeyRoundIcon}
          title="Keys"
        />
        <p className="text-sm text-muted-foreground">
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis,
          architecto ea?
        </p>
      </div>
      <SettingsKeysIntroduction />
      <SettingsKeysToolbar />
      <SettingsKeysTable />
      <SettingsKeysForm />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
