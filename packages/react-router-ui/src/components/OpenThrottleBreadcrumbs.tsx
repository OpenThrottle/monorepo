import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import type { LinkProps } from 'react-router';
import { Link } from 'react-router';

export interface OpenThrottleBreadcrumbsProps {
  children: React.ReactNode;
  className?: string;
  links: readonly LinkProps[];
}

export const OpenThrottleBreadcrumbs = (
  props: OpenThrottleBreadcrumbsProps,
): React.ReactElement => {
  const { children, className, links } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Breadcrumb className={className} data-testid="OpenThrottleBreadcrumbs">
      <BreadcrumbList className="min-w-0 flex-nowrap sm:flex-wrap">
        {links.map((link, index) => {
          const key = `${link.to.toString()}-${index}`;
          // Phones only fit the nearest parent next to the current page.
          const isHiddenOnPhones = index < links.length - 1;

          return (
            <React.Fragment key={key}>
              {/* The root crumb is short; let the titles after it absorb the squeeze. */}
              <BreadcrumbItem
                className={cn(
                  index === 0 ? 'shrink-0' : 'min-w-0',
                  isHiddenOnPhones && 'max-sm:hidden',
                )}
              >
                <BreadcrumbLink asChild={true}>
                  <Link
                    className={cn(
                      'hover:text-accent transition-colors max-sm:truncate',
                      link.className,
                    )}
                    to={link.to}
                    viewTransition={true}
                  >
                    {link.children}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator
                className={cn('shrink-0', isHiddenOnPhones && 'max-sm:hidden')}
              />
            </React.Fragment>
          );
        })}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage
            className="text-accent! min-w-0 font-semibold max-sm:truncate"
            key="current-breadcrumb-page"
          >
            {Array.isArray(children) ? <>{children}</> : children}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};
