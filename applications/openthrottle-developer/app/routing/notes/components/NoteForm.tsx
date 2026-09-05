import * as React from 'react';
import clsx from 'clsx';
import { Form, Link } from 'react-router';
import {
  Button,
  Input,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import type { NoteCardFragment } from '~/__generated__/graphql';

export interface NoteFormProps {
  action: 'create' | 'update';
  /**
   * Who a newly created note will be attributed to, for the create action's
   * read-only attribution line. The server derives the stored author from the
   * request principal, so this is display only — omit it when unknown.
   */
  authorName?: string;
  className?: string;
  /** Action-level error to surface inline (validation / not-found). */
  error?: string;
  note?: NoteCardFragment;
}

export const NoteForm = (props: NoteFormProps): React.ReactElement => {
  const { action, authorName, className, error, note } = props;

  // Hooks

  // Setup
  const isCreate = action === 'create';

  // Handlers

  // Markup
  // Creating a note takes no author input: the server stamps it from the
  // authenticated principal, so all we owe the user is who that will be.
  const attribution =
    authorName != null && authorName !== '' ? (
      <p className="text-muted-foreground text-sm">Author: {authorName}</p>
    ) : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <Form
        className={clsx('w-full', className)}
        data-testid="NoteForm"
        method="post"
      >
        <div className="w-full space-y-4">
          <div>
            <Label htmlFor="content">Content</Label>
            <TextArea
              defaultValue={note?.content}
              id="content"
              name="content"
              required={true}
              rows={8}
            />
          </div>
          {isCreate ? (
            attribution
          ) : (
            <div>
              <Label htmlFor="author">Author (optional)</Label>
              <Input
                defaultValue={note?.author ?? ''}
                id="author"
                name="author"
                type="text"
              />
            </div>
          )}
        </div>

        {error ? (
          <p className="text-destructive mt-2 text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <Button type="submit">
            {isCreate ? 'Create note' : 'Update note'}
          </Button>
          <Button asChild={true} variant="outline">
            <Link to="/notes">Cancel</Link>
          </Button>
        </div>
      </Form>
    </div>
  );
};
