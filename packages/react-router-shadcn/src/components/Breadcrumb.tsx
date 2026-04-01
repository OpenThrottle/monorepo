import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils/cn';

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<'nav'> {}

export const Breadcrumb = React.forwardRef<HTMLElement | null, BreadcrumbProps>(
  ({ className, ...props }, ref) => (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex', className)}
      ref={ref}
      {...props}
    />
  ),
);
Breadcrumb.displayName = 'Breadcrumb';

export interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<'ol'> {}

export const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  BreadcrumbListProps
>(({ className, ...props }, ref) => (
  <ol
    className={cn(
      'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground',
      className,
    )}
    ref={ref}
    {...props}
  />
));
BreadcrumbList.displayName = 'BreadcrumbList';

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<'li'> {}

export const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  BreadcrumbItemProps
>(({ className, ...props }, ref) => (
  <li
    className={cn('inline-flex items-center gap-1.5', className)}
    ref={ref}
    {...props}
  />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<'a'> {
  asChild?: boolean;
}

export const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps
>(({ asChild = false, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      className={cn('transition-colors hover:text-foreground', className)}
      ref={ref}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<'span'> {}

export const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  BreadcrumbPageProps
>(({ className, ...props }, ref) => (
  <span
    aria-current="page"
    className={cn('font-normal text-foreground', className)}
    ref={ref}
    role="link"
    {...props}
  />
));
BreadcrumbPage.displayName = 'BreadcrumbPage';

export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<'li'> {
  children?: React.ReactNode;
}

export const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  BreadcrumbSeparatorProps
>(({ children, className, ...props }, ref) => (
  <li
    aria-hidden={true}
    className={cn('[&>svg]:size-3.5', className)}
    ref={ref}
    role="presentation"
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
));
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';
