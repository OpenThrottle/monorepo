import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { PersonasStats } from '~/routing/personas/components/PersonasStats';
import { PersonasToolbar } from '~/routing/personas/components/PersonasToolbar';
import { PersonasTable } from '~/routing/personas/components/PersonasTable';
import { PersonasIntroduction } from '~/routing/personas/components/PersonasIntroduction';
import type { Route } from '@/app/routes/+types/personas._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Personas',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Personas | ${SITE_TITLE}` }];
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
      <PersonasIntroduction />
      <PersonasStats />
      <PersonasToolbar />
      <PersonasTable />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
