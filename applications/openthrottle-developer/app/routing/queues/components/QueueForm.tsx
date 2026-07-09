import * as React from 'react';
import clsx from 'clsx';
import { Form } from 'react-router';
import { Link } from 'react-router';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';

export interface QueueFormProps {
  actionData?: { error?: string } | null;
  className?: string;
}

export const QueueForm = (props: QueueFormProps): React.ReactElement => {
  const { actionData, className } = props;

  // Hooks

  // Setup
  const error = actionData?.error;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('p-4', className)} data-testid="QueueForm">
      <Form className="w-full space-y-4" method="post">
        <div>
          <Label htmlFor="queue-name">Queue name</Label>
          <Input
            id="queue-name"
            name="name"
            placeholder="e.g. my-queue"
            required={true}
            type="text"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Letters, numbers, hyphens, and underscores only. Max 128 characters.
          </p>
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button asChild={true} type="submit" variant="outline">
            <Link to="/queues">Cancel</Link>
          </Button>
          <Button type="submit" variant="secondary">
            Create queue
          </Button>
        </div>
      </Form>
    </div>
  );
};
