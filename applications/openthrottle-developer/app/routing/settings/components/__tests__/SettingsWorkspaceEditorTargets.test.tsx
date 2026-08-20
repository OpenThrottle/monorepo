import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { SettingsWorkspaceEditorTargets } from '../SettingsWorkspaceEditorTargets';
import type { SettingsWorkspaceEditorTargetsProps } from '../SettingsWorkspaceEditorTargets';

const targets = [
  {
    displayName: 'monorepo',
    editor: WorkspaceEditorId.Cursor,
    editorLabel: 'Cursor',
    filesystemPath: '/Users/dev/openthrottle',
    id: 'repo-1',
  },
  {
    displayName: 'monorepo',
    editor: WorkspaceEditorId.Vscode,
    editorLabel: 'Visual Studio Code',
    filesystemPath: '/Users/dev/openthrottle',
    id: 'repo-1',
  },
  {
    displayName: 'website',
    editor: WorkspaceEditorId.Cursor,
    editorLabel: 'Cursor',
    filesystemPath: '/Users/dev/website',
    id: 'repo-2',
  },
  {
    displayName: 'website',
    editor: WorkspaceEditorId.Vscode,
    editorLabel: 'Visual Studio Code',
    filesystemPath: '/Users/dev/website',
    id: 'repo-2',
  },
];

const renderTargets = (
  props: SettingsWorkspaceEditorTargetsProps,
  action: (args: { request: Request }) => Promise<unknown> = vi.fn(
    async () => null,
  ),
): RenderResult => {
  const Component = () => <SettingsWorkspaceEditorTargets {...props} />;
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SettingsWorkspaceEditorTargets Component', () => {
  let component: RenderResult;
  let props: SettingsWorkspaceEditorTargetsProps;

  beforeEach(() => {
    props = { hasRepositories: true, targets };
    component = renderTargets(props);
  });

  test('renders one row per repository/editor pairing', () => {
    expect(
      component.getByTestId('SettingsWorkspaceEditorTargets'),
    ).toBeInTheDocument();
    expect(component.getAllByRole('row')).toHaveLength(5);
    expect(component.getAllByText('Visual Studio Code')).toHaveLength(2);
    expect(
      component.getAllByRole('link', { name: 'monorepo' })[0],
    ).toHaveAttribute('href', '/settings/repositories/repo-1');
  });

  test('posts the intent and a single repositoryId from a row action', async () => {
    const user = userEvent.setup();
    let submitted: Record<string, FormDataEntryValue> = {};
    const action = async ({ request }: { request: Request }) => {
      submitted = Object.fromEntries(await request.formData());
      return null;
    };
    component.unmount();
    component = renderTargets(props, action);

    await user.click(component.getAllByRole('button', { name: 'Apply' })[0]);

    expect(submitted).toEqual({
      intent: 'applyEditorConfig',
      repositoryId: 'repo-1',
    });
  });

  test('points at the repositories route when nothing is linked', () => {
    component.unmount();
    component = renderTargets({ hasRepositories: false, targets: [] });

    expect(
      component.getByRole('link', { name: 'Add a repository' }),
    ).toHaveAttribute('href', '/settings/repositories');
  });

  test('asks the user to enable an editor when repositories exist', () => {
    component.unmount();
    component = renderTargets({ hasRepositories: true, targets: [] });

    expect(
      component.getByText(/Enable at least one editor above/i),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: 'Add a repository' }),
    ).not.toBeInTheDocument();
  });
});
