import { Outlet, useRouteLoaderData } from 'react-router';
import { MailLayout } from '~/global/components/MailLayout';
import type { Route } from '@/app/routes/+types/_layout.mail';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';

/**
 * @description Pathless layout for mail-area routes. Renders {@link MailLayout} (sidebar + main) with an `<Outlet />` for child routes (inbox, compose, sent, drafts, trash, search).
 * All mail routes use shadcn-ui via MailLayout (SidebarProvider, MailSidebar, MailToolbar). Sidebar open state is restored from cookie for persistence.
 */
export async function loader(args: Route.LoaderArgs) {
  const { request } = args;

  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${SIDEBAR_COOKIE_NAME}=([^;]+)`));
  const value = match?.[1]?.trim().toLowerCase();
  const defaultSidebarOpen = value !== 'false';

  return { defaultSidebarOpen };
}

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // FIXME: Swap out eventually
  const data = useRouteLoaderData('routes/_layout.mail');

  // Setup
  const defaultSidebarOpen = data?.defaultSidebarOpen ?? true;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MailLayout defaultSidebarOpen={defaultSidebarOpen}>
      <Outlet />
    </MailLayout>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
