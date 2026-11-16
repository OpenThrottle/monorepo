import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { OAUTH_CONSENT_UNAVAILABLE_COPY } from '~/routing/oauth/data/data.copy';

export interface ConsentUnavailableProps {
  className?: string;
}

export const ConsentUnavailable = (
  props: ConsentUnavailableProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn('w-full max-w-lg', className)}
      data-testid="ConsentUnavailable"
    >
      <CardHeader>
        <CardTitle className="text-xl">
          {OAUTH_CONSENT_UNAVAILABLE_COPY.title}
        </CardTitle>
        <CardDescription>
          {OAUTH_CONSENT_UNAVAILABLE_COPY.description}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild={true} variant="outline">
          <Link to="/settings/connections">
            {OAUTH_CONSENT_UNAVAILABLE_COPY.settingsLink}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
