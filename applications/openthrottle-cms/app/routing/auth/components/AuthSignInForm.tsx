import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Form } from 'react-router';

import { AUTH_COPY } from '~/routing/auth/data/data.copy';
import { AUTH_ROUTES } from '~/routing/auth/data/data.routes';

export interface AuthSignInFormProps {
  readonly className: string | undefined;
  /** Why the last attempt failed, from the route action. */
  readonly error: string | undefined;
  readonly isSubmitting: boolean;
  /** The same-origin path to return to once signed in. */
  readonly redirectTo: string;
}

/**
 * @description Email + password sign-in for the CMS. Posts to the current route's action, which
 * calls the `login` mutation and sets the CMS auth cookie.
 */
export const AuthSignInForm = (
  props: AuthSignInFormProps,
): React.ReactElement => {
  const { className, error, isSubmitting, redirectTo } = props;

  // Hooks
  const id = React.useId();

  // Setup
  const emailId = `${id}-email`;
  const passwordId = `${id}-password`;
  const submitLabel = isSubmitting ? AUTH_COPY.submitting : AUTH_COPY.submit;

  // Handlers

  // Markup
  const errorAlert = error && (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn('w-full max-w-sm', className)}
      data-testid="AuthSignInForm"
    >
      <Form method="post">
        <CardHeader>
          <CardTitle>{AUTH_COPY.signInTitle}</CardTitle>
          <CardDescription>{AUTH_COPY.signInHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 py-4">
          {errorAlert}
          <input
            name={AUTH_ROUTES.redirectParam}
            type="hidden"
            value={redirectTo}
          />
          <div className="grid gap-2">
            <Label htmlFor={emailId}>{AUTH_COPY.emailLabel}</Label>
            <Input
              autoComplete="email"
              id={emailId}
              name="email"
              required={true}
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={passwordId}>{AUTH_COPY.passwordLabel}</Label>
            <Input
              autoComplete="current-password"
              id={passwordId}
              name="password"
              required={true}
              type="password"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
};
