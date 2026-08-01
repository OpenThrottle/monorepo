import * as React from 'react';
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface NavigationMenuListProps extends React.ComponentPropsWithoutRef<
  typeof NavigationMenuPrimitive.List
> {}

export const NavigationMenuList = React.forwardRef<
  React.ComponentRef<typeof NavigationMenuPrimitive.List>,
  NavigationMenuListProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <NavigationMenuPrimitive.List
      className={cn(
        'group flex flex-1 list-none items-center justify-center space-x-1',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;
