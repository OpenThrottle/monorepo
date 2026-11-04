import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import { useAtomValue } from 'jotai';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  jobRunHookDraftRowsAtom,
  workflowBranchAtom,
  workflowCheckoutIdAtom,
} from '~/routing/plans/data/atom.plan';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { serializePlanRunConfigUiState } from '~/routing/plans/utils/plan-run-config-ui';

import type { PlanRunConfigStoreProviderProps } from '../PlanRunConfigStoreProvider';
import { PlanRunConfigStoreProvider } from '../PlanRunConfigStoreProvider';

const AtomProbe = (): React.ReactElement => {
  const branch = useAtomValue(workflowBranchAtom);
  const checkoutId = useAtomValue(workflowCheckoutIdAtom);
  const hookRows = useAtomValue(jobRunHookDraftRowsAtom);

  return (
    <div data-testid="AtomProbe">
      <span data-testid="branch">{branch}</span>
      <span data-testid="checkout-id">{checkoutId}</span>
      <span data-testid="hook-row-count">{hookRows.length}</span>
    </div>
  );
};

describe('PlanRunConfigStoreProvider Component', () => {
  let component: RenderResult;
  let props: PlanRunConfigStoreProviderProps;

  beforeEach(() => {
    props = {
      children: <AtomProbe />,
      plan: {
        id: 'plan-1',
        jobRunHooksJson: null,
        runConfigJson: null,
      },
      repositories: Promise.resolve([]),
    };
    component = render(<PlanRunConfigStoreProvider {...props} />);
  });

  test('renders children inside the seeded store', () => {
    expect(component.getByTestId('AtomProbe')).toBeTruthy();
    expect(component.getByTestId('checkout-id')).toHaveTextContent('');
    expect(component.getByTestId('hook-row-count')).toHaveTextContent('0');
  });

  // The provider seeds before workspaceRepositories resolves, so it can only
  // reach the resolver's terminal fallback — which is the point: never blank.
  test('seeds the branch to main without any repositories', () => {
    expect(component.getByTestId('branch')).toHaveTextContent('main');
  });

  test('back-fills the branch from the persisted checkout once repositories resolve', async () => {
    component.unmount();
    component = render(
      <PlanRunConfigStoreProvider
        {...props}
        plan={{
          id: 'plan-1',
          jobRunHooksJson: null,
          runConfigJson: serializePlanRunConfigUiState({
            checkoutId: '11111111-1111-4111-8111-111111111111',
            iterationTimeoutText: '',
            repositoryId: '',
            workflowInput: getDefaultWorkflowRalphRunOptionsInput({
              planId: 'plan-1',
            }),
            workingDirectory: '',
          }),
        }}
        repositories={Promise.resolve([
          {
            checkouts: [
              {
                displayName: 'monorepo',
                filesystemPath: '/Users/me/monorepo',
                id: '11111111-1111-4111-8111-111111111111',
                inspection: {
                  git: { currentBranch: 'feature/x', defaultBranch: null },
                },
                kind: 'primary',
                managed: false,
              },
            ],
            defaultBranch: 'trunk',
            id: 'repo-1',
            name: 'monorepo',
            normalizedRemoteUrl: null,
            projectId: null,
          },
        ])}
      />,
    );

    // Seeded to the fallback first, then hydrated with the real answer.
    expect(component.getByTestId('branch')).toHaveTextContent('main');
    await waitFor(() =>
      expect(component.getByTestId('branch')).toHaveTextContent('feature/x'),
    );
  });
});
