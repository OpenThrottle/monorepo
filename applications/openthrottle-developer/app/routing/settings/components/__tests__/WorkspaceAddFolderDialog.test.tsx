import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceAddFolderDialog } from '../WorkspaceAddFolderDialog';
import type { WorkspaceAddFolderDialogProps } from '../WorkspaceAddFolderDialog';

describe('WorkspaceAddFolderDialog Component', () => {
  let component: RenderResult;
  let props: WorkspaceAddFolderDialogProps;

  beforeEach(() => {
    props = {
      discoveredFolders: [
        {
          alreadyRegistered: false,
          name: 'openthrottle',
          path: '/Users/dev/Development/openthrottle',
        },
        {
          alreadyRegistered: true,
          name: 'registered-repo',
          path: '/Users/dev/Development/registered-repo',
        },
      ],
    };

    const Component = () => <WorkspaceAddFolderDialog {...props} />;
    const RoutesStub = createRoutesStub([
      { Component, action: () => ({ ok: true }), path: '/' },
    ]);

    component = render(<RoutesStub />);
  });

  test('opens the dialog and lists discovered folders', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('WorkspaceAddFolderDialogTrigger'));

    expect(
      component.getByTestId('WorkspaceAddFolderDialog'),
    ).toBeInTheDocument();
    expect(component.getByText('openthrottle')).toBeInTheDocument();
    expect(
      component.getByText('/Users/dev/Development/openthrottle'),
    ).toBeInTheDocument();
  });

  test('marks already-registered folders instead of offering Add', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('WorkspaceAddFolderDialogTrigger'));

    expect(component.getByText('Already added')).toBeInTheDocument();
    // Only the unregistered candidate gets an Add button.
    expect(component.getAllByRole('button', { name: 'Add' })).toHaveLength(1);
  });

  test('reveals the manual server-path escape hatch behind a toggle', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('WorkspaceAddFolderDialogTrigger'));
    expect(component.queryByLabelText('Server path')).not.toBeInTheDocument();

    await user.click(component.getByText('Enter a server path manually'));

    expect(component.getByLabelText('Server path')).toBeInTheDocument();
  });
});
