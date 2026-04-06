import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@openthrottle/react-router-shadcn';
import { Link, LinkProps } from 'react-router';

export interface OpenThrottleBreadcrumbsProps {
  children: React.ReactNode;
  className?: string;
  links: readonly LinkProps[];
}

export const OpenThrottleBreadcrumbs = (
  props: OpenThrottleBreadcrumbsProps,
) => {
  const { children, className, links } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Breadcrumb className={className} data-testid="OpenThrottleBreadcrumbs">
      <BreadcrumbList>
        {links.map((link) => (
          <React.Fragment key={link.to.toString()}>
            <BreadcrumbItem>
              <BreadcrumbLink asChild={true}>
                <Link to={link.to} viewTransition={true}>
                  {link.children}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </React.Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage>{children}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};
