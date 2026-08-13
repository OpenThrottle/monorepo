import * as React from 'react';
import { Tabs, cn } from '@openthrottle/react-router-shadcn';
import { useUrlSyncedTabValue } from '../hooks/useUrlSyncedTabValue';
import type {
  OpenThrottleTabsProps as OpenThrottleTabsPropsContract,
  UrlSyncedTabConfig,
} from '../config/open-throttle-tabs.api';
import { isFullyControlled } from '../utils/is-fully-controlled';

type TabsRestProps = Omit<OpenThrottleTabsPropsContract, 'urlSync'>;

export interface OpenThrottleTabsWithUrlSyncProps extends TabsRestProps {
  readonly urlSync: UrlSyncedTabConfig;
}

/** @see ./OpenThrottleTabs.tsx */
export const OpenThrottleTabsWithUrlSync = React.forwardRef<
  React.ComponentRef<typeof Tabs>,
  OpenThrottleTabsWithUrlSyncProps
>((props, ref): React.ReactElement => {
  const { className, onValueChange, urlSync, value, ...rest } = props;

  // Hooks
  const synced = useUrlSyncedTabValue(urlSync);

  // Setup
  const controlled = isFullyControlled(value, onValueChange);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tabs
      className={cn('w-full', className)}
      onValueChange={controlled ? onValueChange : synced.onValueChange}
      ref={ref}
      value={controlled ? value : synced.value}
      {...rest}
    />
  );
});

OpenThrottleTabsWithUrlSync.displayName = 'OpenThrottleTabsWithUrlSync';
