import * as React from 'react';
import { Tabs, cn } from '@openthrottle/react-router-shadcn';
import { useUrlSyncedTabValue } from '../hooks/useUrlSyncedTabValue';
import type {
  OpenThrottleTabsProps as OpenThrottleTabsPropsContract,
  UrlSyncedTabConfig,
} from '../tabs/open-throttle-tabs.api';

/** @see ../tabs/open-throttle-tabs.api.ts */
export type OpenThrottleTabsProps = OpenThrottleTabsPropsContract;

type TabsRestProps = Omit<OpenThrottleTabsProps, 'urlSync'>;

function isFullyControlled(
  value: TabsRestProps['value'],
  onValueChange: TabsRestProps['onValueChange'],
): boolean {
  return value !== undefined && onValueChange !== undefined;
}

interface OpenThrottleTabsWithUrlSyncProps extends TabsRestProps {
  readonly urlSync: UrlSyncedTabConfig;
}

const OpenThrottleTabsWithUrlSync = React.forwardRef<
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
