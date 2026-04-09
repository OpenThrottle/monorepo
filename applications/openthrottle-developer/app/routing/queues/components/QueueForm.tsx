import * as React from 'react';
import classnames from 'classnames';
import { Form } from 'react-router';
import { Link } from 'react-router';

export interface QueueFormProps {
  readonly actionData?: { error?: string } | null;
  readonly className?: string;
}

export const QueueForm = (props: QueueFormProps) => {
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
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="queue-name"
          >
            Queue name
          </label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

        <div className="flex gap-3">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            type="submit"
          >
            Create queue
          </button>
          <Link
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            to="/queues"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
};
