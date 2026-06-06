import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CreateProject from '../projects.create';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('routes/projects.create.tsx', () => {
  test('renders project form in create mode', () => {
    renderRoutesStub(
      <CreateProject
        actionData={undefined}
        loaderData={{}}
        matches={[] as never}
        params={{}}
      />,
    );

    expect(screen.getByTestId('ProjectForm')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Project name')).toBeRequired();
    expect(
      screen.getByRole('button', { name: 'Create project' }),
    ).toBeInTheDocument();
  });
});
