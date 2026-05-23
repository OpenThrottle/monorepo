import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import {
  SidebarFooter,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';

export interface GlobalSidebarFooterProps {
  readonly health?: ServerHealthObject;
}

export const GlobalSidebarFooter = (
  props: GlobalSidebarFooterProps,
): React.ReactElement => {
  const { health } = props;

  // Hooks

  // Setup
  const { api, database, redis } = health ?? {};
  const allOnline = api === 'ok' && database === 'ok' && redis === 'ok';
  const color = allOnline ? 'bg-green-500' : 'bg-amber-500';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SidebarFooter className="border-t border-border bg-card px-6 py-4 overflow-hidden text-center">
      <SidebarMenu>
        <SidebarMenuItem>
          <Link
            className="flex items-center text-xs text-muted-foreground"
            target="_blank"
            to={`${ENV_SOURCE.API_URL_EXTERNAL}/health`}
          >
            <div
              className={classnames('h-2 w-2 shrink-0 rounded-full', color)}
            />
            <SidebarGroupLabel>&nbsp; System Status</SidebarGroupLabel>
          </Link>
          {/* </SidebarMenuButton> */}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
};
