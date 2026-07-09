import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CreateNote from '../notes.create';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { Route } from '@/app/routes/+types/notes.create';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/notes.create',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/notes.create.tsx', () => {
  test('renders note form in create mode', () => {
    renderRoutesStub(
      <CreateNote
        actionData={undefined}
        loaderData={{}}
        matches={matches}
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
