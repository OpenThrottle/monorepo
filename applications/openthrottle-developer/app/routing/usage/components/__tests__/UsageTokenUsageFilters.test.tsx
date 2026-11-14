import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { UsageTokenUsageFiltersProps } from '../UsageTokenUsageFilters';
import { UsageTokenUsageFilters } from '../UsageTokenUsageFilters';

const renderComponent = (props: UsageTokenUsageFiltersProps): RenderResult => {
  const Component = (): React.ReactElement => {
    return <UsageTokenUsageFilters {...props} />;
  };
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

  test('provider links carry only the provider param', () => {
    const component = renderComponent({ selectedProvider: null });

    const href = component
      .getByRole('link', { name: 'Claude' })
      .getAttribute('href');
    expect(href).toBe('/?provider=claude');
  });
});
