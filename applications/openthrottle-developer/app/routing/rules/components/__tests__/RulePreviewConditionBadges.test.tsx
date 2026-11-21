import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import type { RulePreviewNonMatchFragment } from '~/__generated__/graphql';

import { RulePreviewConditionBadges } from '../RulePreviewConditionBadges';

const plan = (
  overrides: Partial<RulePreviewNonMatchFragment>,
): RulePreviewNonMatchFragment => {
  return {
    conditions: [
      {
        actual: null,
        condition: 'repository',
        expected: 'repo-1',
        passed: false,
      },
      {
        actual: 'PENDING',
        condition: 'status',
        expected: 'PENDING',
        passed: true,
      },
      { actual: null, condition: 'environment', expected: null, passed: true },
    ],
    failedOnlyOnEnvironment: false,
    id: 'plan-1',
    missingTags: [],
    projectId: null,
    repositoryId: null,
    status: 'PENDING',
    title: 'Ship it',
    ...overrides,
  };
};

describe('RulePreviewConditionBadges', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders one badge per visible condition with its verdict', () => {
    const component = render(<RulePreviewConditionBadges plan={plan({})} />);

    const badges = component.getAllByTestId('RulePreviewCondition');

    expect(badges.map((badge) => badge.dataset.condition)).toEqual([
      'repository',
      'status',
    ]);
    expect(badges.map((badge) => badge.dataset.passed)).toEqual([
      'false',
      'true',
    ]);
  });

  test('lists missing tags only when there are some', () => {
    const none = render(<RulePreviewConditionBadges plan={plan({})} />);
    expect(
      none.queryByTestId('RulePreviewMissingTags'),
    ).not.toBeInTheDocument();
    cleanup();

    const some = render(
      <RulePreviewConditionBadges plan={plan({ missingTags: ['spike'] })} />,
    );
    expect(some.getByTestId('RulePreviewMissingTags')).toHaveTextContent(
      'spike',
    );
  });

  test('flags a plan that fails only on environment', () => {
    const component = render(
      <RulePreviewConditionBadges
        plan={plan({ failedOnlyOnEnvironment: true })}
      />,
    );

    expect(
      component.getByTestId('RulePreviewEnvironmentOnly'),
    ).toBeInTheDocument();
  });

  test('omits the environment note otherwise', () => {
    const component = render(<RulePreviewConditionBadges plan={plan({})} />);

    expect(
      component.queryByTestId('RulePreviewEnvironmentOnly'),
    ).not.toBeInTheDocument();
  });

  test('renders a project condition badge when the rule qualifies on project', () => {
    const component = render(
      <RulePreviewConditionBadges
        plan={plan({
          conditions: [
            {
              actual: 'proj-2',
              condition: 'project',
              expected: 'proj-1',
              passed: false,
            },
          ],
        })}
      />,
    );

    const [badge] = component.getAllByTestId('RulePreviewCondition');

    expect(badge?.dataset.condition).toBe('project');
    expect(badge?.dataset.passed).toBe('false');
  });
});
