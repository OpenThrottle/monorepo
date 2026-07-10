import * as React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import NoteDetail from '../notes.$noteId';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { createTestRoutesStub } from '~/testing/route-fixtures';
import { render } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { Route } from '@/app/routes/+types/notes.$noteId';

const note = {
  __typename: 'NoteObject' as const,
  author: 'visormatt',
  content: '# Hello note\n\nSome **markdown** body.',
  createdAt: '2026-01-01T00:00:00.000Z',
  id: 'note-1',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/notes.$noteId',
    loaderData: { note: null },
    params: { noteId: 'note-1' },
    pathname: '/',
  },
];

function renderNoteDetail(initialEntries: readonly string[]): void {
  const Stub = createTestRoutesStub([
    {
      Component: (): React.ReactElement => (
        <NoteDetail
          actionData={undefined}
          loaderData={{ note }}
          matches={matches}
          params={{ noteId: 'note-1' }}
        />
      ),
      path: '/notes/:noteId',
    },
  ]);

  render(
    <TooltipProvider>
      <Stub initialEntries={[...initialEntries]} />
    </TooltipProvider>,
  );
}

describe('routes/notes.$noteId.tsx', () => {
  test('defaults to read mode rendering the note content as markdown', () => {
    renderNoteDetail(['/notes/note-1']);

    expect(screen.getByTestId('MarkdownRenderer')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Hello note' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('NoteForm')).not.toBeInTheDocument();
  });

  test('renders the edit form when mode=edit is in the URL', () => {
    renderNoteDetail(['/notes/note-1?mode=edit']);

    expect(screen.getByTestId('NoteForm')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toHaveValue(note.content);
    expect(
      screen.getByRole('button', { name: /update note/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('MarkdownRenderer')).not.toBeInTheDocument();
  });

  test('toggles from read to edit via the Edit button', async () => {
    const user = userEvent.setup();
    renderNoteDetail(['/notes/note-1']);

    expect(screen.getByTestId('MarkdownRenderer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByTestId('NoteForm')).toBeInTheDocument();
    expect(screen.queryByTestId('MarkdownRenderer')).not.toBeInTheDocument();
  });

  test('renders the empty state when the note is missing', () => {
    const Stub = createTestRoutesStub([
      {
        Component: (): React.ReactElement => (
          <NoteDetail
            actionData={undefined}
            loaderData={{ note: null }}
            matches={matches}
            params={{ noteId: 'missing' }}
          />
        ),
        path: '/notes/:noteId',
      },
    ]);

    render(
      <TooltipProvider>
        <Stub initialEntries={['/notes/missing']} />
      </TooltipProvider>,
    );

    expect(screen.getByText('Note not found')).toBeInTheDocument();
    expect(screen.queryByTestId('NoteForm')).not.toBeInTheDocument();
  });
});
