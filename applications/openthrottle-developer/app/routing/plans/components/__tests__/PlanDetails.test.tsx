import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanDetails } from '../PlanDetails';
import type { PlanDetailsProps } from '../PlanDetails';
import type { PlanDetailsFragment } from '~/__generated__/graphql';
import {
  WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
  WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
} from '~/routing/plans/utils/workflow-run-options-search-param';

/**
 * @description Renders current URLSearchParams for assertions (memory router does not update window.location).
 */
const SearchParamsProbe = () => {
  const [params] = useSearchParams();
  return <span data-testid="search-params-probe">{params.toString()}</span>;
};

const mockPlan: PlanDetailsFragment = {
  __typename: 'PlanObject',
  assignee: 'visormatt',
  author: 'visormatt',
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: 'plan-1',
  projectId: 'proj-1',
  projectRelation: {
    __typename: 'ProjectObject',
    id: 'proj-1',
    name: 'Test Project',
  },
  status: 'IN_PROGRESS',
  summary: 'Plan summary',
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('PlanDetails Component', () => {
  let component: RenderResult;
  let props: PlanDetailsProps;

  beforeEach(() => {
    props = { plan: mockPlan };

    const Component = () => <PlanDetails {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('should render plan shell and title', () => {
    expect(component.getByTestId('PlanDetails')).toBeInTheDocument();
    expect(component.getByText('Test Plan')).toBeInTheDocument();
  });

  test('should collapse workflow run options by default', () => {
    expect(
      component.getByTestId('workflow-run-options-collapsed'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('WorkflowRunOptions'),
    ).not.toBeInTheDocument();
  });

  test('should show full workflow run options when runOptions is expanded in the URL', () => {
    const Component = () => <PlanDetails {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const expanded = render(
      <RoutesStub
        initialEntries={[
          `/?${WORKFLOW_RUN_OPTIONS_SEARCH_PARAM}=${WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE}`,
        ]}
      />,
    );

    expect(expanded.getByTestId('WorkflowRunOptions')).toBeInTheDocument();
    expect(expanded.getByTestId('workflow-run-plan-id-input')).toHaveValue(
      'plan-1',
    );
  });

  test('should add runOptions to the URL when expanding and remove it when collapsing', async () => {
    cleanup();
    const user = userEvent.setup();
    const Component = () => (
      <>
        <SearchParamsProbe />
        <PlanDetails {...props} />
      </>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const r = render(<RoutesStub initialEntries={['/']} />);

    expect(r.getByTestId('search-params-probe')).toHaveTextContent('');
    await user.click(r.getByTestId('workflow-run-options-expand'));

    await waitFor(() => {
      expect(r.getByTestId('search-params-probe')).toHaveTextContent(
        `${WORKFLOW_RUN_OPTIONS_SEARCH_PARAM}=${WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE}`,
      );
    });
    expect(r.getByTestId('WorkflowRunOptions')).toBeInTheDocument();

    await user.click(
      r.getByRole('button', { name: 'Hide workflow run options' }),
    );

    await waitFor(() => {
      expect(r.getByTestId('search-params-probe')).toHaveTextContent('');
    });
    expect(r.queryByTestId('WorkflowRunOptions')).not.toBeInTheDocument();
  });

  test('should preserve other query params when toggling workflow run options', async () => {
    cleanup();
    const user = userEvent.setup();
    const Component = () => (
      <>
        <SearchParamsProbe />
        <PlanDetails {...props} />
      </>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const r = render(<RoutesStub initialEntries={['/?view=board&keep=1']} />);

    expect(r.getByTestId('search-params-probe')).toHaveTextContent(
      'view=board&keep=1',
    );

    await user.click(r.getByTestId('workflow-run-options-expand'));

    await waitFor(() => {
      const raw = r.getByTestId('search-params-probe').textContent ?? '';
      expect(raw).toContain('view=board');
      expect(raw).toContain('keep=1');
      expect(raw).toContain(
        `${WORKFLOW_RUN_OPTIONS_SEARCH_PARAM}=${WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE}`,
      );
    });

    await user.click(
      r.getByRole('button', { name: 'Hide workflow run options' }),
    );

    await waitFor(() => {
      expect(r.getByTestId('search-params-probe')).toHaveTextContent(
        'view=board&keep=1',
      );
    });
  });

  test('should show formatted metadata with labels', () => {
    expect(component.getByText('Author')).toBeInTheDocument();
    expect(component.getByText('Assignee')).toBeInTheDocument();
    expect(component.getByText('Category')).toBeInTheDocument();
    expect(component.getByText('Project')).toBeInTheDocument();
    expect(component.getByText('Created')).toBeInTheDocument();
    expect(component.getByText('Updated')).toBeInTheDocument();
  });

  test('should show description and summary', () => {
    expect(component.getByText('Plan description')).toBeInTheDocument();
    expect(component.getByText('Plan summary')).toBeInTheDocument();
  });

  test('should put tuning JSON on the run form when a workflow option differs from defaults', async () => {
    cleanup();
    const user = userEvent.setup();
    const Component = () => <PlanDetails {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const r = render(
      <RoutesStub
        initialEntries={[
          `/?${WORKFLOW_RUN_OPTIONS_SEARCH_PARAM}=${WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE}`,
        ]}
      />,
    );

    const tuningNode = r
      .getByTestId('PlanToolbar')
      .querySelector('input[name="ralphTuning"]');
    expect(tuningNode).toBeInstanceOf(HTMLInputElement);
    if (!(tuningNode instanceof HTMLInputElement)) {
      throw new Error('expected ralphTuning hidden input');
    }
    expect(tuningNode.value).toBe('');

    const modelInput = r.getByLabelText('Cursor model for --model');
    await user.clear(modelInput);
    await user.type(modelInput, 'fast');

    await waitFor(() => {
      expect(tuningNode.value).toBe(JSON.stringify({ model: 'fast' }));
    });
  });
});
