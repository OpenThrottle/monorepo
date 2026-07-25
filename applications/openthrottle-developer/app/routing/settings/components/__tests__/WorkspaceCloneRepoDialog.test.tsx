import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { WorkspaceCloneRepoDialog } from '../WorkspaceCloneRepoDialog';

describe('WorkspaceCloneRepoDialog Component', () => {
  const renderDialog = (): ReturnType<typeof render> => {
    const Component = (): React.ReactElement => (
      <WorkspaceCloneRepoDialog actionError={null} />
    );
    const RoutesStub = createRoutesStub([
      { Component, action: () => null, path: '/' },
    ]);
    return render(<RoutesStub />);
  };

  test('renders the clone trigger', () => {
    renderDialog();

    expect(
      screen.getByTestId('WorkspaceCloneRepoDialogTrigger'),
    ).toHaveTextContent('Clone repo');
  });

  test('opens the dialog with a git URL field and the cloneRepo intent', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByTestId('WorkspaceCloneRepoDialogTrigger'));

    const dialog = await screen.findByTestId('WorkspaceCloneRepoDialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText('Git URL')).toBeInTheDocument();
    expect(dialog.querySelector('input[name="intent"]')).toHaveValue(
      'cloneRepo',
    );
  });
});
