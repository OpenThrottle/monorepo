import * as React from 'react';
import { redirect } from 'react-router-dom';
import { MailGlobalErrorBoundary } from '~/global/components/MailGlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';

/**
 * @description Pathless layout for mail-area routes. Renders {@link MailLayout} (sidebar + main) with an `<Outlet />` for child routes (inbox, compose, sent, drafts, trash, search).
 * All mail routes use shadcn-ui via MailLayout (SidebarProvider, MailSidebar, MailToolbar). Sidebar open state is restored from cookie for persistence.
 */
export async function loader(_args: Route.LoaderArgs) {
  return redirect('/mail/', { status: 302 });
}

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement | null {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return null;
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = MailGlobalErrorBoundary;
