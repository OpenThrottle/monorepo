import * as React from 'react';
import classnames from 'classnames';
import { Form, Link } from 'react-router';
import { NoteCardFragment } from '~/__generated__/graphql';

export interface NoteFormProps {
  action: 'create' | 'update';
  className?: string;
  note?: NoteCardFragment;
}

export const NoteForm = (props: NoteFormProps) => {
  const { action, className, note } = props;

  // Hooks

  // Setup
  const isCreate = action === 'create';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <Form
        className={classnames('w-full', className)}
        data-testid="NoteForm"
        method="post"
      >
        <div className="space-y-4 w-full">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="content">
              Content
            </label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue={note?.content}
              id="content"
              name="content"
              required={true}
              rows={8}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="author">
              Author (optional)
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue={note?.author ?? ''}
              id="author"
              name="author"
              type="text"
            />
          </div>
        </div>

        {/* {error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null} */}

        <div className="mt-6 flex gap-3">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            type="submit"
          >
            {isCreate ? 'Create note' : 'Update note'}
          </button>
          <Link
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            to="/notes"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
};
