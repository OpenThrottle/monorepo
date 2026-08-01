import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { UsageSkillUsageSummary } from '../UsageSkillUsageSummary';
import type { UsageSkillUsageSummaryProps } from '../UsageSkillUsageSummary';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
} from '../../data/skill-usage-copy';
import type { UsageSkillUsageByScopeFragment } from '~/__generated__/graphql';

const buildByScope = (
  overrides: Partial<UsageSkillUsageByScopeFragment>,
): UsageSkillUsageByScopeFragment => ({
  count: 0,
  scope: SKILL_USAGE_SCOPES.OURS,
  ...overrides,
});

const renderComponent = (props: UsageSkillUsageSummaryProps): RenderResult => {
  return render(<UsageSkillUsageSummary {...props} />);
};

describe('UsageSkillUsageSummary Component', () => {
  test('renders total and ours vs third-party counts', () => {
    const component = renderComponent({
      byScope: [
        buildByScope({ count: 5, scope: SKILL_USAGE_SCOPES.OURS }),
        buildByScope({ count: 2, scope: SKILL_USAGE_SCOPES.THIRD_PARTY }),
      ],
      totalCount: 7,
    });

    expect(component.getByTestId('UsageSkillUsageSummary')).toBeInTheDocument();
    expect(component.getByText('Total invocations')).toBeInTheDocument();
    expect(component.getByText('7')).toBeInTheDocument();
    expect(component.getByText('5')).toBeInTheDocument();
    expect(component.getByText('2')).toBeInTheDocument();
    expect(
      component.getByText(`${SKILL_USAGE_COPY.scopeSplitHeading} — Ours`),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        `${SKILL_USAGE_COPY.scopeSplitHeading} — Third-party`,
      ),
    ).toBeInTheDocument();
  });

  test('defaults missing scope rows to zero', () => {
    const component = renderComponent({
      byScope: [],
      totalCount: 0,
    });

    expect(component.getAllByText('0')).toHaveLength(3);
  });
});
