import { Tabs as TabsPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TabsContentProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Content
> {}

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  return (
    <TabsPrimitive.Content
      className={cn('flex-1 outline-none', className)}
      data-slot="tabs-content"
      ref={ref}
      {...rest}
    />
  );
});

TabsContent.displayName = TabsPrimitive.Content.displayName;
