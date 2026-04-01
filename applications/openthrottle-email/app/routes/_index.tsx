import { redirect } from 'react-router-dom';
import type { Route } from '@/app/routes/+types/_index';

/**
 * @description Pathless layout for mail-area routes. Renders {@link MailLayout} (sidebar + main) with an `<Outlet />` for child routes (inbox, compose, sent, drafts, trash, search).
 * All mail routes use shadcn-ui via MailLayout (SidebarProvider, MailSidebar, MailToolbar). Sidebar open state is restored from cookie for persistence.
 */
export async function loader(_args: Route.LoaderArgs) {
  return redirect('/mail/', { status: 302 });
}

export default function MailLayoutRoute(props: Route.ComponentProps) {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return null;
}
