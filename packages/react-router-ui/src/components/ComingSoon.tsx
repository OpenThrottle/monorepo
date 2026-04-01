import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from '@openthrottle/react-router-shadcn';

export interface ComingSoonProps {
  className?: string;
  message?: string;
  title?: string;
}

export const ComingSoon = (props: ComingSoonProps) => {
  const {
    className,
    message = "We're working on it.",
    title = 'Coming soon',
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames(
        'flex flex-col items-center justify-center text-center',
        className,
      )}
      data-testid="ComingSoon"
    >
      <CardHeader>
        <div className="mx-auto mb-2 flex justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">
          Check back later for updates.
        </p>
      </CardContent>
    </Card>
  );
};
