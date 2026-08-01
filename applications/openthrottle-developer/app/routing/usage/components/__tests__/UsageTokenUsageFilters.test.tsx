import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UsageTokenUsageFilters } from '../UsageTokenUsageFilters';
import type { UsageTokenUsageFiltersProps } from '../UsageTokenUsageFilters';

const renderComponent = (props: UsageTokenUsageFiltersProps): RenderResult => {
  const Component = (): React.ReactElement => (
    <UsageTokenUsageFilters {...props} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('UsageTokenUsageFilters Component', () => {
  test('renders provider chips and marks the active provider', () => {
    const component = renderComponent({
      selectedProvider: 'claude',
    });

    expect(component.getByTestId('UsageTokenUsageFilters')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'All providers' }),
    ).toHaveAttribute('href', '/');
    const claudeLink = component.getByRole('link', { name: 'Claude' });
    expect(claudeLink).toHaveAttribute('href', '/?provider=claude');
    expect(claudeLink).toHaveAttribute('aria-current', 'true');
  });

  test('preserves skill-usage search params when changing provider', () => {
    const component = renderComponent({
      selectedProvider: null,
      skillCwdParam: '/Users/matt/openthrottle',
      skillGitBranchParam: 'example-usage-tracking',
      skillScopeParam: 'ours',
    });

    const claudeLink = component.getByRole('link', { name: 'Claude' });
    const href = claudeLink.getAttribute('href') ?? '';
    expect(href).toContain('provider=claude');
    expect(href).toContain('skillScope=ours');
    expect(href).toContain('skillBranch=example-usage-tracking');
    expect(href).toContain('skillCwd=');
  });
});
