import * as React from 'react';
import classnames from 'classnames';
import { Form, Link } from 'react-router';
import {
  Button,
  Input,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import { NoteCardFragment } from '~/__generated__/graphql';

export interface NoteFormProps {
  action: 'create' | 'update';
  className?: string;
  note?: NoteCardFragment;
}

export const NoteForm = (props: NoteFormProps): React.ReactElement => {
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
            <Label htmlFor="content">Content</Label>
            <TextArea
              defaultValue={note?.content}
              id="content"
              name="content"
              required={true}
              rows={8}
            />
          </div>
          <div>
            <Label htmlFor="author">Author (optional)</Label>
            <Input
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
