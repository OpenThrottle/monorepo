import * as React from 'react';
import { Link } from 'react-router';
import classnames from 'classnames';

interface CheckoutSuccessContentProps {
  readonly className?: string;
}

export const CheckoutSuccessContent = (props: CheckoutSuccessContentProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4 space-y-6', className)}
      data-testid="CheckoutSuccessContent"
    >
      <h2 className="text-3xl font-bold">Thank you</h2>
      <p className="text-muted-foreground">
        Your payment was successful. You now have access to your plan.
      </p>
      <Link className="text-primary underline underline-offset-4" to="/">
        Back to home
      </Link>
    </div>
  );
};
