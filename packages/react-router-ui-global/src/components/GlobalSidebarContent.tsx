import * as React from 'react';
import classnames from 'classnames';
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
import { ChevronDown } from 'lucide-react';
import type { NavLinkProps } from 'react-router';
import { getPathFromTo } from '../utils/utils.global';

export interface GlobalSidebarContentLinkProps extends NavLinkProps {
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

  // Setup
  const sections = Object.keys(data ?? {});

  const isLinkActive = (item: GlobalSidebarContentLinkProps): boolean => {
    const toPath = getPathFromTo(item.to);
    const isExact = item.end === true;
    return isExact
      ? location.pathname === toPath
      : location.pathname.startsWith(toPath);
  };

  // Handlers

  // Markup
  const renderLink = (item: GlobalSidebarContentLinkProps, index: number) => {
    const { children, icon: IconComponent, to } = item;

    const toPath = getPathFromTo(to);
    const key = `${toPath}-${index}`;

    const isActive = isLinkActive(item);

    return (
      <SidebarMenuItem className="m-0" key={key} style={{ margin: 0 }}>
        <SidebarMenuButton
          asChild={true}
          isActive={isActive}
          tooltip={String(children)}
        >
          <NavLink className="text-xs!" to={item.to} viewTransition={true}>
            <IconComponent
              className={classnames('size-4 shrink-0', {
                'text-accent': isActive,
                'text-muted-foreground': !isActive,
              })}
            />
            <span className={classnames('', { 'text-accent': isActive })}>
              {item.children?.toString()}
            </span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Life Cycle

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
