import * as React from 'react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown, StarIcon } from 'lucide-react';
import type { NavLinkProps } from 'react-router';
import { getPathFromTo } from '../utils/utils.global';
import {
  FEATURE_BETA_PREVIEW,
  FEATURE_CHARLIE_PREVIEW,
} from '@openthrottle/react-router-utils';

export interface GlobalSidebarContentLinkProps extends NavLinkProps {
  beta?: boolean;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
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

  // Setup
  const sections = Object.keys(data ?? {});
  const isBetaEnabled = FEATURE_BETA_PREVIEW;
  const isCharlieEnabled = FEATURE_CHARLIE_PREVIEW;

  // Handlers
  const isLinkActive = (item: GlobalSidebarContentLinkProps): boolean => {
    const toPath = getPathFromTo(item.to);
    const isExact = item.end === true;

    return isExact
      ? location.pathname === toPath
      : location.pathname.startsWith(toPath);
  };

  // Markup
  const renderLink = (item: GlobalSidebarContentLinkProps, index: number) => {
    const { children, icon: IconComponent, to } = item;

    const toPath = getPathFromTo(to);
    const key = `${toPath}-${index}`;

    const isExact = item.end === true;
    const isActive = isExact
      ? location.pathname === toPath
      : location.pathname.startsWith(toPath);

    if (item.beta && !isBetaEnabled) {
      return null;
    }

    return (
      <SidebarMenuItem
        className="m-0"
        key={key}
        ref={isActive ? activeItemRef : undefined}
        style={{ margin: 0 }}
      >
        <SidebarMenuButton
          asChild={true}
          isActive={isActive}
          tooltip={String(children)}
        >
          <NavLink
            className={clsx('text-xs!', {
              'text-muted-foreground pointer-events-none':
                item.disabled && !isCharlieEnabled,
            })}
            to={item.to}
            viewTransition={true}
          >
            <IconComponent
              className={clsx('size-4 shrink-0', {
                'text-accent': isActive,
                'text-muted-foreground': !isActive,
              })}
            />
            <span className={clsx('', { 'text-accent': isActive })}>
              {item.children?.toString()}
            </span>
            {item.beta && (
              <span className="text-muted-foreground flex w-full flex-1 items-center justify-end text-right">
                <StarIcon
                  className={clsx('size-3', {
                    'text-accent': isActive,
                    'text-muted-foreground': !isActive,
                  })}
                  fill={isActive ? 'currentColor' : 'none'}
                />
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
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
        const hasActiveLinkInSection = items.some(isLinkActive);

        const defaultOpen =
          sectionDefaultExpanded?.[section] !== undefined
            ? sectionDefaultExpanded[section]!
            : defaultSectionsExpanded !== false
              ? true
              : hasActiveLinkInSection;

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
