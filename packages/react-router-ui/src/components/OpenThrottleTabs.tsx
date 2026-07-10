import * as React from 'react';
import { Tabs, cn } from '@openthrottle/react-router-shadcn';
import { OpenThrottleTabsWithUrlSync } from './OpenThrottleTabsWithUrlSync';
import type { OpenThrottleTabsProps as OpenThrottleTabsPropsContract } from '../tabs/open-throttle-tabs.api';

/** @see ../tabs/open-throttle-tabs.api.ts */
export type OpenThrottleTabsProps = OpenThrottleTabsPropsContract;

/**
 * @description Controlled Radix tabs with optional URL search-param sync (Approach A).
 * Use {@link TabsList}, {@link TabsTrigger}, and {@link TabsContent} from shadcn as children.
 */
export const OpenThrottleTabs = React.forwardRef<
  React.ComponentRef<typeof Tabs>,
  OpenThrottleTabsProps
>((props, ref): React.ReactElement => {
  const { className, urlSync, ...rest } = props;

  if (urlSync) {
    return (
      <OpenThrottleTabsWithUrlSync
        className={className}
        ref={ref}
        urlSync={urlSync}
        {...rest}
      />
    );
  }

  return <Tabs className={cn('w-full', className)} ref={ref} {...rest} />;
});

OpenThrottleTabs.displayName = 'OpenThrottleTabs';
