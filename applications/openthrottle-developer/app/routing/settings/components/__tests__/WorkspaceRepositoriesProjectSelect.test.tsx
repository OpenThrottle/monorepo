import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceRepositoriesProjectSelect } from '../WorkspaceRepositoriesProjectSelect';
import type { WorkspaceRepositoriesProjectSelectProps } from '../WorkspaceRepositoriesProjectSelect';

describe('WorkspaceRepositoriesProjectSelect Component', () => {
  let component: RenderResult;
  let props: WorkspaceRepositoriesProjectSelectProps;

  beforeEach(() => {
    props = {
      currentProjectId: null,
      name: 'projectId',
      projects: [
        { id: 'proj-1', name: 'openthrottle-developer' },
        { id: 'proj-2', name: 'openthrottle-server' },
      ],
    };
  });

  test('renders the "No project" option plus every provided project', () => {
    component = render(<WorkspaceRepositoriesProjectSelect {...props} />);

    expect(
      component.getByRole('option', { name: 'No project' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('option', { name: 'openthrottle-developer' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('option', { name: 'openthrottle-server' }),
    ).toBeInTheDocument();
  });

  test('defaults to "No project" when currentProjectId is null', () => {
    component = render(<WorkspaceRepositoriesProjectSelect {...props} />);

    expect(component.getByRole('combobox')).toHaveValue('__none__');
  });

  test('defaults to the matching project when currentProjectId is set', () => {
    props = { ...props, currentProjectId: 'proj-2' };
    component = render(<WorkspaceRepositoriesProjectSelect {...props} />);

    expect(component.getByRole('combobox')).toHaveValue('proj-2');
  });

  test('sets the select name attribute for form submission', () => {
    component = render(<WorkspaceRepositoriesProjectSelect {...props} />);

    expect(component.getByRole('combobox')).toHaveAttribute(
      'name',
      'projectId',
    );
  });

  test('allows selecting a different project', async () => {
    component = render(<WorkspaceRepositoriesProjectSelect {...props} />);

    await userEvent.selectOptions(
      component.getByRole('combobox'),
      'openthrottle-server',
    );

    expect(component.getByRole('combobox')).toHaveValue('proj-2');
  });
});
