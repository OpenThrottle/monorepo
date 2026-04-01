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

export interface PricingToggleProps {
  readonly onValueChange: (value: BillingInterval) => void;
  readonly value: BillingInterval;
  readonly className?: string;
}

export const PricingToggle = (props: PricingToggleProps) => {
  const { value, onValueChange, className } = props;

  return (
    <Tabs className={cn(className)} data-testid="PricingToggle">
      <TabsList>
        {BILLING_INTERVAL_OPTIONS.map((option) => (
          <TabsTrigger
            aria-selected={value === option.value}
            data-state={value === option.value ? 'active' : 'inactive'}
            key={option.value}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
