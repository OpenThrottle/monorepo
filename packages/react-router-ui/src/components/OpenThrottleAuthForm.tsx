import * as React from 'react';
import {
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

export interface OpenThrottleAuthFormProps {
  /** Optional form action URL (e.g. for React Router action). Defaults to current path. */
  readonly action?: string;
  /** Optional classnames to apply to the card. */
  readonly className?: string;
  /** Opt-in initial email value (dev convenience). Defaults to empty. */
  readonly defaultEmail?: string;
  /** Opt-in initial password value (dev convenience). Defaults to empty. */
  readonly defaultPassword?: string;
  /** Server or client error message to display (e.g. from actionData or fetcher.data). */
  readonly error?: string;
  /** When true, disables the submit button (e.g. fetcher.state === 'loading'). */
  readonly isLoading?: boolean;
  /** Called after form submit with email and password. Use when handling submit client-side or via fetcher. */
  readonly onSubmit?: (payload: { email: string; password: string }) => void;
}

/**
 * @description Simple login form with email/password using shadcn-ui.
 * Submits via form action (name/intent) or optional onSubmit callback.
 */
export const OpenThrottleAuthForm = (
  props: OpenThrottleAuthFormProps,
): React.ReactElement => {
  const {
    action = '/',
    className,
    defaultEmail = '',
    defaultPassword = '',
    error,
    isLoading = false,
    onSubmit,
  } = props;

  // Hooks
  const [email, setEmail] = React.useState(defaultEmail);
  const [intent, setIntent] = React.useState<'login' | 'register'>('login');
  const [password, setPassword] = React.useState(defaultPassword);

  // Setup
  const isLogin = intent === 'login';

  // Handlers
  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (onSubmit) {
        // Client-side handling: prevent the native POST and hand off the payload.
        e.preventDefault();
        onSubmit({ email, password });
        return;
      }

      // No onSubmit handler: let the native POST to `action` proceed so React
      // Router's form action (or the browser) handles the submission.
    },

    // 🪝 (re)create our submit handler when our state changes
    [email, onSubmit, password],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <Card
        className={cn('mx-auto w-full', className)}
        data-testid="OpenThrottleAuthForm"
      >
        <form action={action} method="POST" onSubmit={handleSubmit}>
          <input name="intent" type="hidden" value={intent} />

          <CardHeader>
            <CardTitle className="text-lg font-normal">
              {isLogin ? 'Sign in' : 'Sign up'}
            </CardTitle>
            <CardDescription className="text-xs">
              {isLogin
                ? 'Enter your email and password to sign in.'
                : 'Enter your email and password to register.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="my-8 flex flex-col gap-4">
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                autoComplete="email"
                data-testid="auth-email-input"
                id="auth-email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required={true}
                type="email"
                value={email}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                autoComplete="current-password"
                data-testid="auth-password-input"
                id="auth-password"
                name="password"
                onChange={(e) => setPassword(e.target.value)}
                required={true}
                type="password"
                value={password}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              data-testid="auth-submit-button"
              disabled={isLoading}
              id="auth-submit-button"
              type="submit"
              variant="secondary"
            >
              {isLoading ? 'Signing in…' : isLogin ? 'Sign in' : 'Sign up'}
            </Button>
          </CardFooter>
          <Button
            className="text-muted-foreground mb-4 w-full text-xs font-normal"
            disabled={isLoading}
            onClick={() => setIntent(isLogin ? 'register' : 'login')}
            type="button"
            variant="link"
          >
            Click here to {isLogin ? 'Sign up' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </>
  );
};
