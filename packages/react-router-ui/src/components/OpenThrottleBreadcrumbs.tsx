import * as React from 'react';
import classnames from 'classnames';
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
        {links.map((link, index) => {
          const key = `${link.to.toString()}-${index}`;

          return (
            <React.Fragment key={key}>
              <BreadcrumbItem>
                <BreadcrumbLink asChild={true}>
                  <Link
                    className={classnames(
                      'hover:text-accent transition-colors',
                      link.className,
                    )}
                    to={link.to}
                    viewTransition={true}
                  >
                    {link.children}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          );
        })}
        <BreadcrumbItem>
          <BreadcrumbPage className="text-accent! font-semibold" key="asdf">
            {Array.isArray(children) ? <>{children}</> : children}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};
