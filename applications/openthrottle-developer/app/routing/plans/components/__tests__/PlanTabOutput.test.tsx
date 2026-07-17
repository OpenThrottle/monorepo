import * as React from 'react';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanTabOutput } from '../PlanTabOutput';
import type { PlanTabOutputProps } from '../PlanTabOutput';
import { renderWithPlanDetailRouteData } from '~/routing/plans/testing/plan-detail-route-data';
import type { PlanDetailRouteDataSeed } from '~/routing/plans/testing/plan-detail-route-data';

const chunk: PlanTabOutputProps['chunks'][number] = {
  __typename: 'PlanOutputStreamChunkObject',
  content: 'Done.',
  createdAt: '2026-01-01T00:00:00.000Z',
  id: 'chunk-1',
  iteration: 1,
  planId: 'plan-1',
};

const ruleApplication = {
  __typename: 'RuleApplicationObject',
  createdAt: '2026-01-02T00:00:00.000Z',
  detailsJson: null,
  id: 'rule-app-1',
  planId: 'plan-1',
  ruleId: 'aaaaaaaa-1111-2222-3333-444444444444',
  state: 'applied',
  taskId: null,
};

const linkedArtifact = {
  __typename: 'LinkedArtifactObject',
  externalKey: 'github:o/r@abc',
  id: 'art-1',
  lifecycle: 'created',
  producedAt: '2026-01-03T00:00:00.000Z',
  source: 'agent',
  type: 'git_commit',
  verification: 'verified',
};

const renderOutput = (
  props: PlanTabOutputProps,
  seed: PlanDetailRouteDataSeed,
): ReturnType<typeof renderWithPlanDetailRouteData> =>
  renderWithPlanDetailRouteData(
    <Tabs value="output">
      <PlanTabOutput {...props} />
    </Tabs>,
    { linkedArtifacts: [], ruleApplications: [], ...seed },
  );

describe('PlanTabOutput Component', () => {
  test('renders all three history sections with empty hints when nothing exists', () => {
    const { getByTestId, getByText } = renderOutput({ chunks: [] }, {});

    expect(getByTestId('PlanLoggerOutput')).toBeInTheDocument();
    expect(getByText('Agent output')).toBeInTheDocument();
    expect(getByText(/No plan output chunks yet/i)).toBeInTheDocument();
    expect(getByText(/No rule changes recorded yet/i)).toBeInTheDocument();
    expect(getByText(/No linked artifacts yet/i)).toBeInTheDocument();
  });

  test('renders the agent output markdown when chunks exist', async () => {
    const { findByText, queryByText } = renderOutput({ chunks: [chunk] }, {});

    // MarkdownRenderer compiles asynchronously, so await the rendered content.
    expect(await findByText('Done.')).toBeInTheDocument();
    expect(queryByText(/No plan output chunks yet/i)).not.toBeInTheDocument();
  });

  test('renders the rule change log when rule applications exist', () => {
    const { getByTestId, queryByText } = renderOutput(
      { chunks: [] },
      { ruleApplications: [ruleApplication] },
    );

    expect(getByTestId('PlanRuleApplications')).toBeInTheDocument();
    expect(
      queryByText(/No rule changes recorded yet/i),
    ).not.toBeInTheDocument();
  });

  test('renders linked artifacts when artifacts exist', () => {
    const { getByTestId, getByText, queryByText } = renderOutput(
      { chunks: [] },
      { linkedArtifacts: [linkedArtifact] },
    );

    expect(getByTestId('LinkedArtifactsPanel')).toBeInTheDocument();
    expect(getByText('git_commit')).toBeInTheDocument();
    expect(queryByText(/No linked artifacts yet/i)).not.toBeInTheDocument();
  });
});
