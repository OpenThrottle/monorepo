import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

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
  const Component = asChild ? SlotPrimitive.Slot : 'a';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Component
      className={cn('hover:text-foreground transition-colors', className)}
      ref={ref}
      {...rest}
    />
  );
});

BreadcrumbLink.displayName = 'BreadcrumbLink';
