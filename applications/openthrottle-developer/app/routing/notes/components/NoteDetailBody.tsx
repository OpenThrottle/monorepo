import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import * as React from 'react';

import type { NoteCardFragment } from '~/__generated__/graphql';
import { NoteForm } from '~/routing/notes/components/NoteForm';

export interface NoteDetailBodyProps {
  error: string | undefined;
  isEditing: boolean;
  note: NoteCardFragment;
}

export const NoteDetailBody = (
  props: NoteDetailBodyProps,
): React.ReactElement => {
  const { error, isEditing, note } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const editForm = <NoteForm action="update" error={error} note={note} />;
  const readView = <MarkdownRenderer source={note.content} />;

  // Life Cycle

  // 🔌 Short Circuit

  return isEditing ? editForm : readView;
};
