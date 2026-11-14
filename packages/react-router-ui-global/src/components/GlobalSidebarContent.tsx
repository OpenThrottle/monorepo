import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@openthrottle/react-router-shadcn';
import {
  FEATURE_BETA_PREVIEW,
  FEATURE_CHARLIE_PREVIEW,
} from '@openthrottle/react-router-utils';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import type { NavLinkProps } from 'react-router';
import { useLocation } from 'react-router';

import { useCloseMobileSidebar } from '../hooks/useCloseMobileSidebar';
import { resolveSectionDefaultOpen } from '../utils/resolveSectionDefaultOpen';
import { hasActiveSidebarLink } from '../utils/sidebar-links';
import { getPathFromTo } from '../utils/utils.global';
import { GlobalSidebarContentLink } from './GlobalSidebarContentLink';

export interface GlobalSidebarContentLinkProps extends NavLinkProps {
  beta?: boolean;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * @description Nested links rendered under this link, only while this link
   * is active. Optional so existing navigation data needs no change.
   */
  subLinks?: readonly GlobalSidebarContentLinkProps[];
}

export interface GlobalSidebarContentProps {
  readonly data?: Record<string, GlobalSidebarContentLinkProps[]>;
  /**
   * @description When false, sections start collapsed except {@link sectionDefaultExpanded}
   * entries and sections that contain the active route. When true or omitted, all sections
   * start expanded.
   */
  readonly defaultSectionsExpanded?: boolean;
  /**
   * @description Initial expanded state per section key (navigation group name). Overrides
   * {@link defaultSectionsExpanded} for that section only.
   */
  readonly sectionDefaultExpanded?: Readonly<Partial<Record<string, boolean>>>;
}

export const GlobalSidebarContent = (
  props: GlobalSidebarContentProps,
): React.ReactElement => {
  const { data, defaultSectionsExpanded, sectionDefaultExpanded } = props;

  // Hooks
  const location = useLocation();
  const activeItemRef = React.useRef<HTMLLIElement | null>(null);
  const closeMobileSidebar = useCloseMobileSidebar();

  // Setup
  const sections = Object.keys(data ?? {});
  const isBetaEnabled = FEATURE_BETA_PREVIEW;
  const isCharlieEnabled = FEATURE_CHARLIE_PREVIEW;

  // Handlers

  // Markup
  const renderLink = (item: GlobalSidebarContentLinkProps, index: number) => {
    return (
      <GlobalSidebarContentLink
        activeItemRef={activeItemRef}
        isBetaEnabled={isBetaEnabled}
        isCharlieEnabled={isCharlieEnabled}
        item={item}
        key={`${getPathFromTo(item.to)}-${index}`}
        onNavigate={closeMobileSidebar}
        pathname={location.pathname}
      />
    );
  };

  // Life Cycle

  // Keep the active link (and its group) in view when the route changes —
  // including direct navigation and back/forward — so items below the fold
  // (e.g. legal links) auto-reveal instead of requiring a manual scroll.
  // block:'nearest' avoids jumping when the item is already visible and
  // scopes the scroll to the nearest scrollable ancestor (SidebarContent).
  React.useEffect(() => {
    const node = activeItemRef.current;

    if (node == null) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    node.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [location.pathname]);

  // 🔌 Short Circuit

  return (
    <SidebarContent className="h-full" title="Global Sidebar Content">
      {sections.map((section) => {
        const items = data?.[section] ?? [];
        const hasActiveLinkInSection = items.some((item) => {
          return hasActiveSidebarLink(item, location.pathname);
        });

        const defaultOpen = resolveSectionDefaultOpen(
          sectionDefaultExpanded?.[section],
          defaultSectionsExpanded,
          hasActiveLinkInSection,
        );

        return (
          <Collapsible
            className="group"
            defaultOpen={defaultOpen}
            key={section}
          >
            <SidebarGroup title={section}>
              <SidebarGroupLabel asChild={true}>
                <CollapsibleTrigger
                  className="justify-between gap-2"
                  type="button"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {section}
                  </span>
                  <ChevronDown
                    aria-hidden={true}
                    className="text-muted-foreground/50 size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu title={section}>
                    {items.map(renderLink)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </SidebarContent>
  );
};
