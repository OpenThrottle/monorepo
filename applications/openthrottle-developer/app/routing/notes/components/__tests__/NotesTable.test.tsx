import type { RenderResult } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import * as React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import type { NoteCardFragment } from '~/__generated__/graphql';
import {
  renderRoutesStub,
  renderWithMemoryRouter,
} from '~/testing/route-fixtures';

import type { NotesTableProps } from '../NotesTable';
import { NotesTable } from '../NotesTable';

const mockNotes: NoteCardFragment[] = [
  {
    __typename: 'NoteObject',
    author: 'visormatt',
    content: '# First Note\n\nBody text here.',
    createdAt: '2025-01-01T00:00:00Z',
    id: 'note-1',
    updatedAt: '2025-01-03T00:00:00Z',
  },
  {
    __typename: 'NoteObject',
    author: null,
    content: 'Plain second note without heading',
    createdAt: '2025-01-02T00:00:00Z',
    id: 'note-2',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

const renderNotesTable = (tableProps: NotesTableProps): RenderResult => {
  return renderRoutesStub(<NotesTable {...tableProps} />);
};

describe('NotesTable Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('shows empty state when notes is empty', () => {
    const component = renderNotesTable({ notes: [] });

    expect(component.getByTestId('NotesTable')).toBeInTheDocument();
    expect(component.getByText('No notes yet')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Create note' }),
    ).toHaveAttribute('href', '/notes/create');
  });

  test('shows filtered empty copy when q search param is set and notes is empty', () => {
    const filtered = renderWithMemoryRouter(
      [
        {
          Component: (): React.ReactElement => <NotesTable notes={[]} />,
          path: '/',
        },
      ],
      { initialEntries: ['/?q=needle'] },
    );

    expect(
      filtered.getByText('No notes match your search'),
    ).toBeInTheDocument();
    expect(
      filtered.getByRole('link', { name: 'Clear search' }),
    ).toHaveAttribute('href', '/notes');
  });

  test('renders table structure with column headers when notes exist', () => {
    const withNotes = renderNotesTable({ notes: mockNotes });

    expect(withNotes.getByTestId('NotesTable')).toBeInTheDocument();
    expect(
      withNotes.getByRole('columnheader', { name: 'Content' }),
    ).toBeInTheDocument();
    expect(
      withNotes.getByRole('columnheader', { name: 'Author' }),
    ).toBeInTheDocument();
    expect(withNotes.queryByRole('columnheader', { name: 'Dates' })).toBeNull();
    expect(
      withNotes.getByTestId('GlobalPopoverActionsHeader'),
    ).toBeInTheDocument();
  });

  test('renders notes from props with preview titles and view links', () => {
    const { container, getByRole, getByText } = renderNotesTable({
      notes: mockNotes,
    });

    expect(getByText('First Note')).toBeInTheDocument();
    expect(container.textContent).toContain('Body text here.');

    expect(
      getByRole('link', {
        name: 'View note: First Note',
      }),
    ).toHaveAttribute('href', '/notes/note-1');

    expect(
      getByRole('link', {
        name: 'View note: Plain second note without heading',
      }),
    ).toHaveAttribute('href', '/notes/note-2');
  });

  test('shows author when present and em dash when missing', () => {
    const { getByLabelText, getByText } = renderNotesTable({
      notes: mockNotes,
    });

    expect(getByLabelText('Author: visormatt')).toBeInTheDocument();
    expect(getByText('—')).toBeInTheDocument();
  });

  test('renders a row actions menu per note', () => {
    const component = renderNotesTable({ notes: mockNotes });

    expect(
      component.getByRole('button', { name: 'Actions for First Note' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', {
        name: 'Actions for Plain second note without heading',
      }),
    ).toBeInTheDocument();
  });
});
