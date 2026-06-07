import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CreateNote from '../notes.create';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('routes/notes.create.tsx', () => {
  test('renders note form in create mode', () => {
    renderRoutesStub(
      <CreateNote
        actionData={undefined}
        loaderData={{}}
        matches={[] as never}
        params={{}}
      />,
    );

    expect(screen.getByTestId('NoteForm')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeRequired();
    expect(
      screen.getByRole('button', { name: /create note/i }),
    ).toBeInTheDocument();
  });
});
