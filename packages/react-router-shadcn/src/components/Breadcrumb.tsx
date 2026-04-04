import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils/cn';

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<'nav'> {}

export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <nav
        aria-label="Breadcrumb"
        className={cn('flex', className)}
        ref={ref}
        {...rest}
      />
    );
  },
);

Breadcrumb.displayName = 'Breadcrumb';

export interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<'ol'> {}

export const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  BreadcrumbListProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ol
      className={cn(
        'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});

BreadcrumbList.displayName = 'BreadcrumbList';

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<'li'> {}

export const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  BreadcrumbItemProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className={cn('inline-flex items-center gap-1.5', className)}
      ref={ref}
      {...rest}
    />
  );
});

BreadcrumbItem.displayName = 'BreadcrumbItem';

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<'a'> {
  asChild?: boolean;
}

export const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps
>((props, ref): React.ReactElement => {
  const { asChild = false, className, ...rest } = props;
  // Hooks

  // Setup
  const Component = asChild ? Slot : 'a';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Component
      className={cn('transition-colors hover:text-foreground', className)}
      ref={ref}
      {...rest}
    />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<'span'> {}

export const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  BreadcrumbPageProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      aria-current="page"
      className={cn('font-normal text-foreground', className)}
      ref={ref}
      role="link"
      {...rest}
    />
  );
});

BreadcrumbPage.displayName = 'BreadcrumbPage';

export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<'li'> {
  children?: React.ReactNode;
}

export const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  BreadcrumbSeparatorProps
>((props, ref): React.ReactElement => {
  const { children, className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      aria-hidden={true}
      className={cn('[&>svg]:size-3.5', className)}
      ref={ref}
      role="presentation"
      {...rest}
    >
      {children ?? <ChevronRight />}
    </li>
  );
});

BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';
