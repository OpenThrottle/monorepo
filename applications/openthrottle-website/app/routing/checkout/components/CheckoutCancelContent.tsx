import * as React from 'react';
import { Link } from 'react-router';
import classnames from 'classnames';

interface CheckoutCancelContentProps {
  readonly className?: string;
}

export const CheckoutCancelContent = (
  props: CheckoutCancelContentProps,
): React.ReactElement => {
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
      data-testid="CheckoutCancelContent"
    >
      <h2 className="text-3xl font-bold">Checkout cancelled</h2>
      <p className="text-muted-foreground">
        Your checkout was cancelled. No charge was made.
      </p>
      <Link className="text-primary underline underline-offset-4" to="/pricing">
        Back to pricing
      </Link>
    </div>
  );
};
