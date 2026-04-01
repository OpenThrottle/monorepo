import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type { CheckoutLineItem } from '~/routing/checkout/types';
import { formatPrice } from '~/global/utils/formatters';

export interface CheckoutSummaryProps {
  readonly className?: string;
  readonly lineItems: readonly CheckoutLineItem[];
  readonly title?: string;
}

export const CheckoutSummary = (props: CheckoutSummaryProps) => {
  const { className, lineItems, title = 'Order summary' } = props;

  // Hooks

  // Setup
  const totalCents = lineItems.reduce((sum, item) => sum + item.priceCents, 0);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('w-full', className)}
      data-testid="CheckoutSummary"
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {lineItems.map((item, index) => (
            <li
              className="flex items-center justify-between text-sm"
              key={index}
            >
              <span>
                {item.label}
                {item.interval ? ` (${item.interval})` : ''}
              </span>
              <span>{formatPrice(item.priceCents)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatPrice(totalCents)}</span>
        </div>
      </CardContent>
    </Card>
  );
};
