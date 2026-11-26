import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type { NoteCardFragment } from '~/__generated__/graphql';
import {
  NOTES_DELETE_FETCHER_KEY,
  NOTES_DELETE_INTENT,
} from '~/routing/notes/config/note-actions';
import {
  NOTE_EDIT_MODE,
  NOTE_MODE_PARAM,
} from '~/routing/notes/config/note-mode';
import { NOTES_ROW_ACTIONS_COPY } from '~/routing/notes/data/copy';
import { notePreviewLabel } from '~/routing/notes/utils/notePreviewLabel';

export interface NotesTableRowActionsProps {
  className?: string;
  readonly note: NoteCardFragment;
}

/**
 * @description Per-row GlobalPopover for a note: view, edit, and a confirmed
 * delete submitted to the notes index action on a keyed fetcher, so the route
 * can show a failure without navigating.
 */
export const NotesTableRowActions = (
  props: NotesTableRowActionsProps,
): React.ReactElement => {
  const { className, note } = props;

  // Hooks

  // Setup
  const label = notePreviewLabel(note.content);
  const noteHref = `/notes/${note.id}`;
  const actions: GlobalPopoverAction[] = [
    {
      id: 'view',
      kind: 'link',
      label: NOTES_ROW_ACTIONS_COPY.viewAction,
      to: noteHref,
    },
    {
      id: 'edit',
      kind: 'link',
      label: NOTES_ROW_ACTIONS_COPY.editAction,
      to: `${noteHref}?${NOTE_MODE_PARAM}=${NOTE_EDIT_MODE}`,
    },
    {
      action: '/notes?index',
      confirm: {
        cancelLabel: NOTES_ROW_ACTIONS_COPY.deleteConfirmCancel,
        confirmLabel: NOTES_ROW_ACTIONS_COPY.deleteConfirmLabel,
        description: (
          <>
            {NOTES_ROW_ACTIONS_COPY.deleteConfirmDescriptionPrefix}{' '}
            <span className="font-medium">{label}</span>
            {NOTES_ROW_ACTIONS_COPY.deleteConfirmDescriptionSuffix}
          </>
        ),
        title: NOTES_ROW_ACTIONS_COPY.deleteConfirmTitle,
      },
      destructive: true,
      fetcherKey: NOTES_DELETE_FETCHER_KEY,
      fields: { id: note.id, intent: NOTES_DELETE_INTENT },
      id: 'delete',
      kind: 'submit',
      label: NOTES_ROW_ACTIONS_COPY.deleteAction,
      navigate: false,
      separatorBefore: true,
    },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalPopover
      actions={actions}
      ariaLabel={`${NOTES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${label}`}
      className={className}
    />
  );
};
