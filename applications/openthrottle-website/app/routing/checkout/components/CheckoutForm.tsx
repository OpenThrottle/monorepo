import * as React from 'react';
import classnames from 'classnames';
import { Form } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';

export interface CheckoutFormProps {
  readonly actionData?: { error?: string } | null;
  readonly className?: string;
  /** When true, form is disabled (e.g. creating session). */
  readonly isPending?: boolean;
}

export const CheckoutForm = (props: CheckoutFormProps) => {
  const { actionData, className, isPending = false } = props;

  // Hooks

  // Setup
  const error = actionData?.error;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('w-full', className)}
      data-testid="CheckoutForm"
    >
      <CardContent>
        <Form className="w-full space-y-4 pt-8" method="post">
          <div className="space-y-2">
            <Label htmlFor="checkout-email">Email</Label>
            <Input
              disabled={isPending}
              id="checkout-email"
              name="email"
              placeholder="you@example.com"
              required={true}
              type="email"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <CardFooter className="flex gap-3 p-0 pt-4">
            <Button disabled={isPending} type="submit">
              {isPending ? 'Redirecting…' : 'Continue to payment'}
            </Button>
          </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
};
