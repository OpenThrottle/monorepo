import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
  Label,
  Switch,
} from '@openthrottle/react-router-shadcn';
import { CheckIcon, PencilIcon, ShieldAlertIcon } from 'lucide-react';
import * as React from 'react';
import { Form } from 'react-router';

import type { OAuthConsentRequestFieldsFragment } from '~/__generated__/graphql';
import { OAUTH_CONSENT_COPY, OAUTH_SCOPES } from '~/routing/oauth/data/copy';

const COPY = OAUTH_CONSENT_COPY;

export interface ConsentCardProps {
  className?: string;
  error: string | null;
  pendingIntent: 'approve' | 'deny' | null;
  request: OAuthConsentRequestFieldsFragment;
}

export const ConsentCard = (props: ConsentCardProps): React.ReactElement => {
  const { className, error, pendingIntent, request } = props;

  // Hooks
  const [allowWrite, setAllowWrite] = React.useState(() => {
    return request.requestedScopes.includes(OAUTH_SCOPES.write);
  });

  // Setup
  const writeRequested = request.requestedScopes.includes(OAUTH_SCOPES.write);
  const appName = request.clientName ?? request.clientHost;
  const isBusy = pendingIntent !== null;
  const isApproving = pendingIntent === 'approve';
  const isDenying = pendingIntent === 'deny';
  const allowLabel = isApproving ? COPY.allowing : COPY.allow;
  const denyLabel = isDenying ? COPY.denying : COPY.deny;

  // Handlers

  // Markup
  const writeScopeRow = (
    <div className="flex items-start gap-3">
      <PencilIcon
        aria-hidden={true}
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
      />
      <div className="flex-1 space-y-1">
        <Label
          className="text-foreground text-sm font-medium"
          htmlFor="oauth-consent-write"
        >
          {OAUTH_CONSENT_COPY.writeScopeTitle}
        </Label>
        <p className="text-muted-foreground text-sm">
          {OAUTH_CONSENT_COPY.writeScopeDescription}
        </p>
      </div>
      <Switch
        checked={allowWrite}
        data-testid="ConsentCard-write-switch"
        disabled={isBusy}
        id="oauth-consent-write"
        onCheckedChange={setAllowWrite}
      />
    </div>
  );

  const writeScopeInput = (
    <input name="scope" type="hidden" value={OAUTH_SCOPES.write} />
  );

  const errorMarkup = (
    <p className="text-destructive text-sm" role="alert">
      {error}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn('w-full max-w-lg', className)}
      data-testid="ConsentCard"
    >
      <CardHeader>
        <CardTitle className="text-xl">{OAUTH_CONSENT_COPY.title}</CardTitle>
        <CardDescription>{OAUTH_CONSENT_COPY.description}</CardDescription>
      </CardHeader>
      <Form method="post">
        <CardContent className="space-y-6">
          <div className="bg-muted/50 space-y-1 rounded-md p-4">
            <p className="text-base font-medium" data-testid="ConsentCard-app">
              {appName}
            </p>
            <p className="text-muted-foreground text-sm">
              {OAUTH_CONSENT_COPY.identifiedAs}{' '}
              <span
                className="text-foreground font-mono"
                data-testid="ConsentCard-host"
              >
                {request.clientHost}
              </span>
              {' · '}
              {OAUTH_CONSENT_COPY.returnsTo}{' '}
              <span className="text-foreground font-mono">
                {request.redirectHost}
              </span>
            </p>
            <p className="text-muted-foreground flex items-start gap-2 pt-2 text-xs">
              <ShieldAlertIcon
                aria-hidden={true}
                className="mt-0.5 size-3.5 shrink-0"
              />
              {OAUTH_CONSENT_COPY.unverifiedName}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckIcon
                aria-hidden={true}
                className="text-primary mt-0.5 size-4 shrink-0"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {OAUTH_CONSENT_COPY.readScopeTitle}
                </p>
                <p className="text-muted-foreground text-sm">
                  {OAUTH_CONSENT_COPY.readScopeDescription}
                </p>
              </div>
            </div>
            {writeRequested ? writeScopeRow : null}
          </div>

          <p className="text-muted-foreground text-xs">
            {OAUTH_CONSENT_COPY.duration}
          </p>
          {error ? errorMarkup : null}

          <input name="scope" type="hidden" value={OAUTH_SCOPES.read} />
          {allowWrite ? writeScopeInput : null}
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-6">
          <Button
            data-testid="ConsentCard-deny"
            disabled={isBusy}
            name="intent"
            type="submit"
            value="deny"
            variant="outline"
          >
            {denyLabel}
          </Button>
          <Button
            data-testid="ConsentCard-allow"
            disabled={isBusy}
            name="intent"
            type="submit"
            value="approve"
          >
            {allowLabel}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
};
