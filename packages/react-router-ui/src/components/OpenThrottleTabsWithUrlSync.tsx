import * as React from 'react';
import { Tabs, cn } from '@openthrottle/react-router-shadcn';
import { useUrlSyncedTabValue } from '../hooks/useUrlSyncedTabValue';
import type {
  OpenThrottleTabsProps as OpenThrottleTabsPropsContract,
  UrlSyncedTabConfig,
} from '../tabs/open-throttle-tabs.api';

type TabsRestProps = Omit<OpenThrottleTabsPropsContract, 'urlSync'>;

function isFullyControlled(
  value: TabsRestProps['value'],
  onValueChange: TabsRestProps['onValueChange'],
): boolean {
  return value !== undefined && onValueChange !== undefined;
}

export interface OpenThrottleTabsWithUrlSyncProps extends TabsRestProps {
  readonly urlSync: UrlSyncedTabConfig;
}

/** @see ./OpenThrottleTabs.tsx */
export const OpenThrottleTabsWithUrlSync = React.forwardRef<
  React.ComponentRef<typeof Tabs>,
  OpenThrottleTabsWithUrlSyncProps
>((props, ref): React.ReactElement => {
  const { className, onValueChange, urlSync, value, ...rest } = props;
  const synced = useUrlSyncedTabValue(urlSync);
  const controlled = isFullyControlled(value, onValueChange);

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
