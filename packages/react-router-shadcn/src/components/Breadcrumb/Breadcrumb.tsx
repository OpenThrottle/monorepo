import * as React from 'react';
import { cn } from '../../utils/cn';

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
