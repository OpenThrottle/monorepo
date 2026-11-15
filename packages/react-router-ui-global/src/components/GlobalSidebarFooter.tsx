import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import {
  Badge,
  cn,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { Link } from 'react-router';

import { GLOBAL_SIDEBAR_FOOTER_COPY } from '../data/data.copy';
import { buildAppReleaseHref } from '../utils/buildAppReleaseHref';
import {
  deriveOverallHealthStatus,
  healthStatusColorClass,
} from '../utils/utils.global';

export interface GlobalSidebarFooterProps {
  /** The consuming app's package.json version; omitted renders no version badge. */
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
    <Badge
      asChild={true}
      className="text-muted-foreground hover:text-foreground border-border bg-transparent px-1.5 py-0 font-mono text-[10px] leading-4 group-data-[collapsible=icon]:hidden hover:bg-transparent"
      data-testid="GlobalSidebarFooterVersion"
      size="xs"
    >
      <a
        aria-label={`${GLOBAL_SIDEBAR_FOOTER_COPY.versionLinkLabel} ${appVersion}`}
        href={buildAppReleaseHref(ENV_SOURCE.APP_NAME, appVersion)}
        rel="noopener noreferrer"
        target="_blank"
      >
        {GLOBAL_SIDEBAR_FOOTER_COPY.versionPrefix}
        {appVersion}
      </a>
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SidebarFooter className="border-border bg-card overflow-hidden border-t px-4 py-2 group-data-[collapsible=icon]:px-2">
      <SidebarMenu>
        <SidebarMenuItem className="flex min-w-0 items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-2 text-[11px] leading-4 transition-colors"
            rel="noopener noreferrer"
            target="_blank"
            to={`${ENV_SOURCE.API_URL_EXTERNAL}/health`}
          >
            <div className={cn('size-1.5 shrink-0 rounded-full', color)} />
            <span className="truncate group-data-[collapsible=icon]:sr-only">
              {GLOBAL_SIDEBAR_FOOTER_COPY.systemStatus}
            </span>
          </Link>
          {versionMarkup}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
};
