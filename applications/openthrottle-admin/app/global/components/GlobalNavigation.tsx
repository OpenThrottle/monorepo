import * as React from 'react';
import {
  Button,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@openthrottle/react-router-shadcn';
import { Form, NavLink, useLocation } from 'react-router';
import { OpenThrottleSidebarHeader } from '@openthrottle/react-router-ui';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { ADMIN_PATHS, dataNavigation } from '~/global/data/data.navigation';
import {
  getNavIcon,
  getPath,
  getPathFromTo,
} from '~/global/utils/utils.global';

export interface GlobalNavigationProps {}

export const GlobalNavigation = (_props: GlobalNavigationProps) => {
  // const { className } = props;

  // Hooks
  const location = useLocation();

  // Setup
  const pathname = location.pathname;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <OpenThrottleSidebarHeader name="Admin" to={ADMIN_PATHS.dashboard} />
      <SidebarContent className="h-full">
        <SidebarGroup className="h-full">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="h-full flex flex-col gap-2">
              {dataNavigation.map((item) => {
                const toPath = getPathFromTo(item.to);

                const isActive =
                  pathname === toPath ||
                  (toPath !== '/' && pathname.startsWith(toPath));

                const path = getPath(item.to);
                const IconComponent = getNavIcon(path);

                return (
                  <SidebarMenuItem key={toPath}>
                    <SidebarMenuButton
                      asChild={true}
                      isActive={isActive}
                      tooltip={String(item.children)}
                    >
                      <NavLink to={item.to} viewTransition={true}>
                        {IconComponent != null ? (
                          <IconComponent className="size-4 shrink-0" />
                        ) : null}
                        <span>{item.children}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <div className="flex-1" />
              <Form action="/" method="post">
                <input name="intent" type="hidden" value="signout" />
                <Button
                  className="flex justify-start p-4 text-left gap-2 w-full text-foreground"
                  size="sm"
                  type="submit"
                  variant="link"
                >
                  <SignOutIcon className="size-5" />
                  Sign out
                </Button>
              </Form>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </>
  );
};
