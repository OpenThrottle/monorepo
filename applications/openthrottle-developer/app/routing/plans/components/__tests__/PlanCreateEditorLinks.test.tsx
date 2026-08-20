import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { PlanCreateEditorLinks } from '../PlanCreateEditorLinks';
import type { PlanCreateEditorLinksProps } from '../PlanCreateEditorLinks';

const repository = {
  displayName: 'openthrottle',
  filesystemPath: '/Users/dev/Development/openthrottle',
  id: 'repo-1',
};

const renderLinks = (props: PlanCreateEditorLinksProps): RenderResult =>
  render(<PlanCreateEditorLinks {...props} />);

describe('PlanCreateEditorLinks Component', () => {
  test('renders nothing when no repository is resolvable', () => {
    const component = renderLinks({
      editors: [WorkspaceEditorId.Cursor],
      repositories: [],
    });

    expect(component.container).toBeEmptyDOMElement();
  });

  test('renders nothing when no editor is enabled', () => {
    const component = renderLinks({ editors: [], repositories: [repository] });

    expect(component.container).toBeEmptyDOMElement();
  });

  test('builds a deep-link per enabled editor from the checkout path', () => {
    const component = renderLinks({
      editors: [WorkspaceEditorId.Cursor, WorkspaceEditorId.Vscode],
      repositories: [repository],
    });

    expect(
      component
        .getByRole('link', { name: /open in cursor/i })
        .getAttribute('href'),
    ).toBe('cursor://file/Users/dev/Development/openthrottle');
    expect(
      component
        .getByRole('link', { name: /open in vs code/i })
        .getAttribute('href'),
    ).toBe('vscode://file/Users/dev/Development/openthrottle');
    expect(component.getByText('openthrottle')).toBeInTheDocument();
  });

  test('renders one row per registered checkout', () => {
    const component = renderLinks({
      editors: [WorkspaceEditorId.Vscode],
      repositories: [
        repository,
        {
          displayName: 'openthrottle (worktree)',
          filesystemPath: '/Users/dev/Development/openthrottle-worktrees/feat',
          id: 'repo-2',
        },
      ],
    });

    const links = component.getAllByRole('link', { name: /open in vs code/i });
    expect(links).toHaveLength(2);
    expect(links[1]?.getAttribute('href')).toBe(
      'vscode://file/Users/dev/Development/openthrottle-worktrees/feat',
    );
  });
});
