import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { cleanup, render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/rules.$ruleId._index';
import { RULE_DETAIL_COPY } from '~/routing/rules/data/data.copy';
import { buildRootMatch } from '~/testing/buildRootMatch';

import RuleDetail from '../rules.$ruleId._index';

const rule = {
  actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
  actionType: 'inject-task',
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  environment: null,
  id: 'rule-1',
  repositoryId: null,
  status: 'PENDING',
  tagAll: ['breakdown'],
  title: 'Grill breakdowns',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
};

const applications = [
  {
    createdAt: '2026-01-02T00:00:00.000Z',
    detailsJson: '{"reason":"skill-unavailable"}',
    id: 'app-1',
    planId: 'plan-1',
    planTitle: 'Ship it',
    ruleId: 'rule-1',
    state: 'flagged',
    taskId: null,
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

const renderDetail = (
  loaderData: Route.ComponentProps['loaderData'],
): ReturnType<typeof render> => {
  const Wrapped = (): React.ReactElement => {
    return (
      <TooltipProvider>
        <RuleDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={[
            buildRootMatch(),
            {
              handle: undefined,
              id: 'routes/rules.$ruleId._index',
              loaderData,
              params: { ruleId: 'rule-1' },
              pathname: '/rules/rule-1',
            },
          ]}
          params={{ ruleId: 'rule-1' }}
        />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([
    { Component: Wrapped, path: '/rules/:ruleId' },
  ]);
  return render(<RoutesStub initialEntries={['/rules/rule-1']} />);
};

describe('routes/rules.$ruleId._index.tsx', () => {
  afterEach(() => {
    cleanup();
  });

  test('composes the header and the applications ledger', async () => {
    const component = renderDetail({
      applications,
      preview: null,
      projects: [],
      repositories: [],
      rule,
    });

    expect(
      await component.findByTestId('RuleDetailHeader'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 1, name: rule.title }),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('RuleApplicationsSection'),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Ship it' })).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
  });

  test('renders a not-found state when the rule is missing', async () => {
    const component = renderDetail({
      applications: [],
      preview: null,
      projects: [],
      repositories: [],
      rule: null,
    });

    expect(
      await component.findByText(RULE_DETAIL_COPY.notFoundTitle),
    ).toBeInTheDocument();
    expect(component.queryByTestId('RuleDetailHeader')).not.toBeInTheDocument();
  });

  test('renders the preview section when the loader carried a preview', async () => {
    const component = renderDetail({
      applications: [],
      preview: {
        kind: 'ready',
        preview: {
          cap: 500,
          environment: null,
          evaluated: 1,
          matched: [],
          matchedCount: 0,
          nonMatching: [],
          specificity: 2,
          truncated: false,
        },
      },
      projects: [],
      repositories: [],
      rule,
    });

    expect(
      await component.findByTestId('RulePreviewSection'),
    ).toBeInTheDocument();
  });

  test('omits the preview section when there is no preview', async () => {
    const component = renderDetail({
      applications: [],
      preview: null,
      projects: [],
      repositories: [],
      rule,
    });

    await component.findByTestId('RuleDetailHeader');
    expect(
      component.queryByTestId('RulePreviewSection'),
    ).not.toBeInTheDocument();
  });
});
