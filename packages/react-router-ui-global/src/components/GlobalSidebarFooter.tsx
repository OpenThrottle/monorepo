import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import {
  Badge,
  cn,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@openthrottle/react-router-shadcn';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { Link } from 'react-router';

import { GLOBAL_SIDEBAR_FOOTER_COPY } from '../data/copy';
import type { GlobalBackgroundActivity } from '../utils/background-activity';
import { buildAppReleaseHref } from '../utils/buildAppReleaseHref';
import {
  deriveOverallHealthStatus,
  healthStatusColorClass,
} from '../utils/utils.global';
import { GlobalBackgroundActivityBar } from './GlobalBackgroundActivityBar';
import { GlobalBackgroundActivityRing } from './GlobalBackgroundActivityRing';

export interface GlobalSidebarFooterProps {
  /** The consuming app's package.json version; omitted renders no version badge. */
  readonly appVersion?: string;
  /**
   * Long-running server work in progress. Non-empty shows a progress bar above
   * System Status (a ring on its dot when the sidebar is collapsed); empty or
   * omitted shows nothing.
   */
  readonly backgroundActivities?: readonly GlobalBackgroundActivity[];
  readonly health?: ServerHealthObject;
}

export const GlobalSidebarFooter = (
  props: GlobalSidebarFooterProps,
): React.ReactElement => {
  const { appVersion, backgroundActivities = [], health } = props;

  // Hooks
  const { isMobile, state } = useSidebar();

  // Setup
  const color = healthStatusColorClass(deriveOverallHealthStatus(health));
  const healthHref = `${ENV_SOURCE.API_URL_EXTERNAL}/health`;
  const hasActivities = backgroundActivities.length > 0;
  // The mobile sidebar is a full-width sheet, never the icon rail.
  const isCollapsed = state === 'collapsed' && !isMobile;
  const showsRing = hasActivities && isCollapsed;
  const showsBar = hasActivities && !isCollapsed;

  // Handlers

  // Markup
  const dotMarkup = (
    <div className={cn('size-1.5 shrink-0 rounded-full', color)} />
  );

  const ringMarkup = (
    <GlobalBackgroundActivityRing activities={backgroundActivities}>
      {dotMarkup}
    </GlobalBackgroundActivityRing>
  );

  const statusDotMarkup = showsRing ? ringMarkup : dotMarkup;

  const barMarkup = showsBar && (
    <SidebarMenuItem>
      <GlobalBackgroundActivityBar
        activities={backgroundActivities}
        href={healthHref}
      />
    </SidebarMenuItem>
  );

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
        {barMarkup}
        <SidebarMenuItem className="flex min-w-0 items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-2 text-[11px] leading-4 transition-colors"
            rel="noopener noreferrer"
            target="_blank"
            to={healthHref}
          >
            {statusDotMarkup}
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
