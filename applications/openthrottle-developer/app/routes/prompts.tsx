import * as React from 'react';
import { Outlet } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/prompts';

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Prompts | ${SITE_TITLE}` }];
});

export default function Index(_props: Route.ComponentProps) {
  // const { actionData } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="max-w-7xl mx-auto w-full"
      data-testid="prompts-layout"
    >
      <Outlet />
    </div>
  );
}

// export const action = async (args: Route.ActionArgs) => {
// };

export const ErrorBoundary = GlobalErrorBoundary;
