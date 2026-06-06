import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import NoteDetail from '../notes.$noteId';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('routes/notes.$noteId.tsx', () => {
  test('renders note form in update mode with note content', () => {
    renderRoutesStub(
      <NoteDetail
        actionData={undefined}
        loaderData={{
          note: {
            __typename: 'NoteObject',
            author: 'visormatt',
            content: 'Hello note',
            createdAt: '2026-01-01T00:00:00.000Z',
            id: 'note-1',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        }}
        matches={[] as never}
        params={{ noteId: 'note-1' }}
      />,
    );

    expect(screen.getByTestId('NoteForm')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toHaveValue('Hello note');
    expect(
      screen.getByRole('button', { name: /update note/i }),
    ).toBeInTheDocument();
  });
});
