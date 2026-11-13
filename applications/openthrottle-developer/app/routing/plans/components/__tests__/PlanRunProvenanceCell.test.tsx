import { render, type RenderResult } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { WorkspaceEditorId } from '~/__generated__/graphql';
import { DefaultEditorContext } from '~/global/config/DefaultEditorContext';

import {
  PlanRunProvenanceCell,
  type PlanRunProvenanceCellProps,
} from '../PlanRunProvenanceCell';

const renderCell = (props: PlanRunProvenanceCellProps): RenderResult => {
  return render(<PlanRunProvenanceCell {...props} />);
};

describe('PlanRunProvenanceCell Component', () => {
  test('renders an em dash when there is no provenance', () => {
    const component = renderCell({});
    expect(component.container.textContent).toContain('—');
    expect(component.queryByText(/open in editor/i)).toBeNull();
  });

  test('renders the branch name', () => {
    const component = renderCell({ branch: 'ot/run-provenance' });
    expect(component.getByText('ot/run-provenance')).toBeInTheDocument();
  });

  test('renders an "Open in editor" deep-link from the checkout path when present', () => {
    const component = renderCell({
      checkout: {
        displayName: 'feature-wt',
        filesystemPath: '/Users/dev/openthrottle-worktrees/feature',
        kind: 'worktree',
      },
    });

    const link = component.getByRole('link', { name: /open in editor/i });
    // Editor scheme deep-link (vscode://file<path>), worktree suffix shown.
    expect(link.getAttribute('href')).toBe(
      'vscode://file/Users/dev/openthrottle-worktrees/feature',
    );
    expect(link.textContent).toContain('worktree');
  });

  test('opens the checkout in the default editor when one is set', () => {
    const component = render(
      <DefaultEditorContext.Provider value={WorkspaceEditorId.Cursor}>
        <PlanRunProvenanceCell
          checkout={{
            displayName: 'feature-wt',
            filesystemPath: '/Users/dev/openthrottle-worktrees/feature',
            kind: 'worktree',
          }}
        />
      </DefaultEditorContext.Provider>,
    );

    const link = component.getByRole('link', { name: /open in editor/i });
    expect(link.getAttribute('href')).toBe(
      'cursor://file/Users/dev/openthrottle-worktrees/feature',
    );
  });

  test('hides the editor link when no checkout is present', () => {
    const component = renderCell({ branch: 'main' });
    expect(
      component.queryByRole('link', { name: /open in editor/i }),
    ).toBeNull();
  });

  test('renders the linked PR with repo#number, state, and GitHub url', () => {
    const component = renderCell({
      pullRequest: {
        number: 270,
        repo: 'OpenThrottle/monorepo',
        state: 'merged',
        url: 'https://github.com/OpenThrottle/monorepo/pull/270',
      },
    });

    const link = component.getByRole('link', {
      name: /OpenThrottle\/monorepo#270/,
    });
    expect(link.getAttribute('href')).toBe(
      'https://github.com/OpenThrottle/monorepo/pull/270',
    );
    expect(component.getByText('merged')).toBeInTheDocument();
  });
});
