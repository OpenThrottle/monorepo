import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsWorkspaceApplyResults } from '../SettingsWorkspaceApplyResults';
import type { SettingsWorkspaceApplyResultsProps } from '../SettingsWorkspaceApplyResults';

const results = [
  {
    displayName: 'monorepo',
    editorLabel: 'Cursor',
    filesWritten: ['.cursor/mcp.json', '.cursor/rules/openthrottle.mdc'],
    filesystemPath: '/Users/dev/openthrottle',
    repositoryId: 'repo-1',
    warnings: ['Skipped .cursor/skills — path is not writable'],
  },
];

const renderResults = (
  props: SettingsWorkspaceApplyResultsProps,
): RenderResult => {
  const Component = () => <SettingsWorkspaceApplyResults {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SettingsWorkspaceApplyResults Component', () => {
  let component: RenderResult;
  let props: SettingsWorkspaceApplyResultsProps;

  beforeEach(() => {
    props = { results, summary: 'Updated 1 editor/repo pairing(s).' };
    component = renderResults(props);
  });

  test('renders the files written and each warning for a repository', () => {
    expect(
      component.getByTestId('SettingsWorkspaceApplyResults'),
    ).toBeInTheDocument();
    expect(component.getByText('monorepo')).toBeInTheDocument();
    expect(component.getByText('.cursor/mcp.json')).toBeInTheDocument();
    expect(
      component.getByText('Skipped .cursor/skills — path is not writable'),
    ).toBeInTheDocument();
    expect(component.getByRole('status')).toHaveTextContent(
      'Updated 1 editor/repo pairing(s).',
    );
  });

  test('renders the empty state when nothing was applied', () => {
    component.unmount();
    component = renderResults({ results: [] });

    expect(
      component.getByText(/No linked repositories to update/i),
    ).toBeInTheDocument();
  });
});
