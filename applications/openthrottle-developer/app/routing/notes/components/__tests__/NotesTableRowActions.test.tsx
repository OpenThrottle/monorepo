import type { RenderResult } from '@testing-library/react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { NoteCardFragment } from '~/__generated__/graphql';
import { NOTES_ROW_ACTIONS_COPY } from '~/routing/notes/data/copy';

import { NotesTableRowActions } from '../NotesTableRowActions';

const NOTE: NoteCardFragment = {
  __typename: 'NoteObject',
  author: 'visormatt',
  content: '# Shopping list\n\nEggs',
  createdAt: '2025-01-01T00:00:00Z',
  id: 'note-1',
  updatedAt: null,
};

const ARIA_LABEL = `${NOTES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} Shopping list`;

const renderRowActions = (
  indexAction: (args: { request: Request }) => Promise<unknown>,
): RenderResult => {
  const Component = (): React.ReactElement => {
    return <NotesTableRowActions note={NOTE} />;
  };
  const RoutesStub = createRoutesStub([
    {
      children: [{ Component, action: indexAction, index: true }],
      path: '/notes',
    },
  ]);

  return render(<RoutesStub initialEntries={['/notes']} />);
};

describe('NotesTableRowActions Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('links View and Edit to the note detail route', async () => {
    const user = userEvent.setup();
    const component = renderRowActions(async () => null);

    await user.click(component.getByRole('button', { name: ARIA_LABEL }));

    expect(
      component.getByRole('menuitem', {
        name: NOTES_ROW_ACTIONS_COPY.viewAction,
      }),
    ).toHaveAttribute('href', '/notes/note-1');
    expect(
      component.getByRole('menuitem', {
        name: NOTES_ROW_ACTIONS_COPY.editAction,
      }),
    ).toHaveAttribute('href', '/notes/note-1?mode=edit');
  });

  test('submits a confirmed delete to the notes index action', async () => {
    const user = userEvent.setup();
    const received: Record<string, string>[] = [];
    const indexAction = vi.fn(async (args: { request: Request }) => {
      const formData = await args.request.formData();
      const entries: Record<string, string> = {};

      formData.forEach((value, key) => {
        entries[key] = String(value);
      });
      received.push(entries);

      return { noteDeleted: true };
    });
    const component = renderRowActions(indexAction);

    await user.click(component.getByRole('button', { name: ARIA_LABEL }));
    await user.click(
      component.getByRole('menuitem', {
        name: NOTES_ROW_ACTIONS_COPY.deleteAction,
      }),
    );

    expect(
      component.getByTestId('GlobalPopoverConfirmDialog'),
    ).toBeInTheDocument();

    await user.click(
      component.getByTestId('GlobalPopoverConfirmDialogConfirm'),
    );

    await waitFor(() => {
      expect(indexAction).toHaveBeenCalledTimes(1);
    });
    expect(received[0]).toEqual({ id: 'note-1', intent: 'deleteNote' });
  });

  test('does not submit when the delete is cancelled', async () => {
    const user = userEvent.setup();
    const indexAction = vi.fn(async () => null);
    const component = renderRowActions(indexAction);

    await user.click(component.getByRole('button', { name: ARIA_LABEL }));
    await user.click(
      component.getByRole('menuitem', {
        name: NOTES_ROW_ACTIONS_COPY.deleteAction,
      }),
    );
    await user.click(component.getByTestId('GlobalPopoverConfirmDialogCancel'));

    expect(indexAction).not.toHaveBeenCalled();
  });
});
