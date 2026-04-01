import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { NoteCardFragment } from '~/__generated__/graphql';

export interface NoteCardProps {
  className?: string;
  note: NoteCardFragment;
}

export const NoteCard = (props: NoteCardProps) => {
  const { className, note } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('flex flex-col', className)}
      data-testid="NoteCard"
      key={note.id}
    >
      <CardContent className="overflow-hidden flex-1 p-4">
        <p
          className="line-clamp-3 text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </CardContent>

      <CardFooter className="flex justify-end p-2 pt-0">
        <Button asChild={true} className="text-xs" variant="outline">
          <Link to={`/notes/${note.id}`} viewTransition={true}>
            View Note
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
