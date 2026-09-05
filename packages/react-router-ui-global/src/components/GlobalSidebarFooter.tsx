import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import {
  SidebarFooter,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';
import {
  deriveOverallHealthStatus,
  healthStatusColorClass,
} from '../utils/utils.global';

export interface GlobalSidebarFooterProps {
  readonly health?: ServerHealthObject;
}

export const GlobalSidebarFooter = (
  props: GlobalSidebarFooterProps,
): React.ReactElement => {
  const { health } = props;

  // Hooks

  // Setup
  const color = healthStatusColorClass(deriveOverallHealthStatus(health));

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SidebarFooter className="border-border bg-card overflow-hidden border-t px-6 py-4 text-center">
      <SidebarMenu>
        <SidebarMenuItem>
          <Link
            className="text-muted-foreground flex items-center text-xs"
            target="_blank"
            to={`${ENV_SOURCE.API_URL_EXTERNAL}/health`}
          >
            <div className={clsx('h-2 w-2 shrink-0 rounded-full', color)} />
            <SidebarGroupLabel>&nbsp; System Status</SidebarGroupLabel>
          </Link>
          {/* </SidebarMenuButton> */}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
};
