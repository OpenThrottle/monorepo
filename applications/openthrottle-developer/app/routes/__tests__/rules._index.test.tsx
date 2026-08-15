import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { cleanup, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { RULES_COPY, RULES_ONBOARDING } from '~/routing/rules/data/data.copy';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { TagActionRuleRowData } from '~/routing/rules/components/RulesTable';
import Index from '../rules._index';
import type { Route } from '@/app/routes/+types/rules._index';

const enabledRule: TagActionRuleRowData = {
  actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
  actionType: 'inject-task',
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  environment: null,
  id: 'rule-enabled',
  status: 'PENDING',
  tagAll: ['breakdown'],
  title: 'Grill breakdowns',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
};

const disabledRule: TagActionRuleRowData = {
  actionPayloadJson: '{"skillSlug":"docs"}',
  actionType: 'availability-exception',
  createdAt: '2026-01-02T00:00:00.000Z',
  enabled: false,
  environment: 'staging',
  id: 'rule-disabled',
  status: null,
  tagAll: ['docs'],
  title: 'Docs exception',
  updatedAt: '2026-01-02T00:00:00.000Z',
  userId: 'user-1',
};

const matchesFor = (
  rules: TagActionRuleRowData[],
): Route.ComponentProps['matches'] => [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/rules._index',
    loaderData: { rules },
    params: {},
    pathname: '/rules',
  },
];

const renderIndex = (
  rules: TagActionRuleRowData[],
  initialEntry = '/rules',
): ReturnType<typeof render> => {
  // useFetcher + useSearchParams require a data router.
  const Wrapped = (): React.ReactElement => (
    <TooltipProvider>
      <Index
        actionData={undefined}
        loaderData={{ rules }}
        matches={matchesFor(rules)}
        params={{}}
      />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/rules' }]);

  return render(<RoutesStub initialEntries={[initialEntry]} />);
};

describe('routes/rules._index.tsx', () => {
  afterEach(() => {
    cleanup();
  });

  test('composes stats, introduction, toolbar, and table', () => {
    const component = renderIndex([enabledRule, disabledRule]);

    expect(component.getByTestId('RulesStats')).toBeInTheDocument();
    expect(component.getByTestId('RulesIntroduction')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: RULES_COPY.pageTitle }),
    ).toBeInTheDocument();
    expect(component.getByText(RULES_COPY.pageDescription)).toBeInTheDocument();
    expect(component.getByTestId('RulesToolbar')).toBeInTheDocument();
    expect(component.getByTestId('RulesTable')).toBeInTheDocument();
    expect(component.getByText(enabledRule.title)).toBeInTheDocument();
    expect(component.getByText(disabledRule.title)).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: RULES_COPY.newRuleAction }),
    ).toHaveAttribute('href', '/rules/new');
  });

  test('shows the onboarding pitch for a new user (empty + unfiltered)', () => {
    const component = renderIndex([]);

    // New-user block replaces the toolbar/table; RulesEmpty is not used here.
    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.getByTestId('RulesIntroduction')).toBeInTheDocument();
    expect(component.queryByTestId('RulesTable')).not.toBeInTheDocument();
    expect(component.queryByTestId('RulesEmpty')).not.toBeInTheDocument();
    expect(
      component.getByRole('link', { name: RULES_ONBOARDING.cta.label }),
    ).toHaveAttribute('href', '/rules/new');
  });

  test('filters rules client-side from enabled search param', () => {
    const component = renderIndex(
      [enabledRule, disabledRule],
      '/rules?enabled=disabled',
    );

    expect(component.queryByText(enabledRule.title)).not.toBeInTheDocument();
    expect(component.getByText(disabledRule.title)).toBeInTheDocument();
  });

  test('filters rules client-side from q search param', () => {
    const component = renderIndex([enabledRule, disabledRule], '/rules?q=docs');

    expect(component.queryByText(enabledRule.title)).not.toBeInTheDocument();
    expect(component.getByText(disabledRule.title)).toBeInTheDocument();
  });

  test('shows filtered-empty copy when filters match nothing', () => {
    const component = renderIndex(
      [enabledRule, disabledRule],
      '/rules?q=zzzz-no-match',
    );

    expect(component.getByTestId('RulesEmpty')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: RULES_COPY.filteredEmptyTitle }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: RULES_COPY.clearFiltersAction }),
    ).toHaveAttribute('href', '/rules');
  });
});
