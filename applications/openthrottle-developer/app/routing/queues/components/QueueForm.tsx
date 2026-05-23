import * as React from 'react';
import classnames from 'classnames';
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
    <div className={classnames('p-4', className)} data-testid="QueueForm">
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
          <p className="mt-1 text-xs text-muted-foreground">
            Letters, numbers, hyphens, and underscores only. Max 128 characters.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 justify-end">
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
