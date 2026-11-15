import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import {
  cn,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { Link } from 'react-router';

import { GLOBAL_SIDEBAR_FOOTER_COPY } from '../data/data.copy';
import {
  deriveOverallHealthStatus,
  healthStatusColorClass,
} from '../utils/utils.global';

export interface GlobalSidebarFooterProps {
  /** The consuming app's package.json version; omitted renders no version line. */
  readonly appVersion?: string;
  readonly health?: ServerHealthObject;
}

export const GlobalSidebarFooter = (
  props: GlobalSidebarFooterProps,
): React.ReactElement => {
  const { appVersion, health } = props;

  // Hooks

  // Setup
  const color = healthStatusColorClass(deriveOverallHealthStatus(health));

  // Handlers

  // Markup
  const versionMarkup = appVersion !== undefined && (
    <SidebarMenuItem>
      <p
        className="text-muted-foreground text-xs group-data-[collapsible=icon]:hidden"
        data-testid="GlobalSidebarFooterVersion"
      >
        {GLOBAL_SIDEBAR_FOOTER_COPY.versionLabel} {appVersion}
      </p>
    </SidebarMenuItem>
  );

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
            <div className={cn('h-2 w-2 shrink-0 rounded-full', color)} />
            <SidebarGroupLabel>&nbsp; System Status</SidebarGroupLabel>
          </Link>
          {/* </SidebarMenuButton> */}
        </SidebarMenuItem>
        {versionMarkup}
      </SidebarMenu>
    </SidebarFooter>
  );
};
