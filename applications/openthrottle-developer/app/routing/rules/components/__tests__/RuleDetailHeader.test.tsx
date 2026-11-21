import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { RULE_DETAIL_COPY } from '~/routing/rules/data/data.copy';

import type { RuleDetailHeaderProps } from '../RuleDetailHeader';
import { RuleDetailHeader } from '../RuleDetailHeader';

const rule = {
  actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
  actionType: 'inject-task',
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  environment: null,
  id: 'rule-1',
  projectId: null,
  repositoryId: 'repo-1',
  status: 'PENDING',
  tagAll: ['breakdown'],
  title: 'Grill breakdowns',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
};

const renderHeader = (
  overrides?: Partial<RuleDetailHeaderProps>,
): ReturnType<typeof render> => {
  const props: RuleDetailHeaderProps = {
    onToggleEnabled: vi.fn(),
    pending: false,
    projectNames: new Map([['proj-1', 'Platform']]),
    repositoryNames: new Map([['repo-1', 'monorepo']]),
    rule,
    ...overrides,
  };
  const Component = (): React.ReactElement => {
    return (
      <TooltipProvider>
        <RuleDetailHeader {...props} />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('RuleDetailHeader', () => {
  afterEach(() => {
    cleanup();
  });

  test('shows the title, scope trail and action summary', () => {
    const component = renderHeader();

    expect(
      component.getByRole('heading', { level: 1, name: rule.title }),
    ).toBeInTheDocument();
    expect(component.getByTestId('RulesScopeBadges')).toHaveTextContent(
      'monorepo',
    );
    expect(component.getByTestId('RuleDetailActionSummary')).toHaveTextContent(
      'grilling',
    );
  });

  test('shows the project in the scope trail', () => {
    const component = renderHeader({
      rule: { ...rule, projectId: 'proj-1' },
    });

    expect(component.getByTestId('RulesScopeBadges')).toHaveTextContent(
      'Platform',
    );
  });

  test('links to the edit route', () => {
    const component = renderHeader();

    expect(
      component.getAllByRole('link').some((link) => {
        return link.getAttribute('href') === '/rules/rule-1/edit';
      }),
    ).toBe(true);
  });

  test('reflects the enabled state and delegates the toggle', async () => {
    const onToggleEnabled = vi.fn();
    const component = renderHeader({ onToggleEnabled });
    const toggle = component.getByRole('switch', {
      name: RULE_DETAIL_COPY.enabledLabel,
    });

    expect(toggle).toBeChecked();

    await userEvent.setup().click(toggle);

    expect(onToggleEnabled).toHaveBeenCalledWith(rule);
  });

  test('disables the switch while a submission is pending', () => {
    const component = renderHeader({ pending: true });

    expect(
      component.getByRole('switch', { name: RULE_DETAIL_COPY.enabledLabel }),
    ).toBeDisabled();
  });
});
