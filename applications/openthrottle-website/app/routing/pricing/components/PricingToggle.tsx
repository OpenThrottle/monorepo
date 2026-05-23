import * as React from 'react';
import {
  cn,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { BILLING_INTERVAL_OPTIONS } from '~/routing/pricing/types';
import type { BillingInterval } from '~/routing/pricing/types';

export type { BillingInterval };

interface PricingToggleProps {
  readonly className?: string;
  // FIXME: We should remove the string typing here
  readonly onValueChange: (value: BillingInterval | string) => void;
  readonly value: BillingInterval;
}

export const PricingToggle = (
  props: PricingToggleProps,
): React.ReactElement => {
  const { value, onValueChange, className } = props;

  return (
    <Tabs
      className={cn(className)}
      data-testid="PricingToggle"
      onValueChange={(next) => {
        onValueChange(next);
      }}
      value={value}
    >
      <TabsList>
        {BILLING_INTERVAL_OPTIONS.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
