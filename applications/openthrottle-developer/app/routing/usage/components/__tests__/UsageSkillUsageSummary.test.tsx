import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { UsageSkillUsageByScopeFragment } from '~/__generated__/graphql';

import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
} from '../../data/skill-usage-copy';
import type { UsageSkillUsageSummaryProps } from '../UsageSkillUsageSummary';
import { UsageSkillUsageSummary } from '../UsageSkillUsageSummary';

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
  test('renders total and the ours / personal / third-party counts', () => {
    const component = renderComponent({
      byScope: [
        buildByScope({ count: 5, scope: SKILL_USAGE_SCOPES.OURS }),
        buildByScope({ count: 4, scope: SKILL_USAGE_SCOPES.PERSONAL }),
        buildByScope({ count: 2, scope: SKILL_USAGE_SCOPES.THIRD_PARTY }),
      ],
      totalCount: 11,
    });

    expect(component.getByTestId('UsageSkillUsageSummary')).toBeInTheDocument();
    expect(component.getByText('Total invocations')).toBeInTheDocument();
    expect(component.getByText('11')).toBeInTheDocument();
    expect(component.getByText('5')).toBeInTheDocument();
    expect(component.getByText('4')).toBeInTheDocument();
    expect(component.getByText('2')).toBeInTheDocument();
    expect(
      component.getByText(`${SKILL_USAGE_COPY.scopeSplitHeading} — Ours`),
    ).toBeInTheDocument();
    expect(
      component.getByText(`${SKILL_USAGE_COPY.scopeSplitHeading} — Personal`),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        `${SKILL_USAGE_COPY.scopeSplitHeading} — Third-party`,
      ),
    ).toBeInTheDocument();
    expect(
      component.getByText(SKILL_USAGE_COPY.scopePersonalHint),
    ).toBeInTheDocument();
  });

  test('defaults missing scope rows to zero', () => {
    const component = renderComponent({
      byScope: [],
      totalCount: 0,
    });

    // Total plus one tile per scope member.
    expect(component.getAllByText('0')).toHaveLength(4);
  });
});
