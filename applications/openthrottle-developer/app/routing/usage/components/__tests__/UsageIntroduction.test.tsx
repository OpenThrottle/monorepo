import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { UsageIntroduction } from '../UsageIntroduction';

describe('UsageIntroduction Component', () => {
  test('renders Usage heading and range copy', () => {
    const component = renderRoutesStub(<UsageIntroduction rangeDays={14} />);

    expect(
      component.getByRole('heading', { name: 'Usage' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        /Usage metrics for this portal over the last 14 days/,
      ),
    ).toBeInTheDocument();
  });

  test('links to the usage sub-pages', () => {
    const component = renderRoutesStub(<UsageIntroduction rangeDays={14} />);

    expect(component.getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'href',
      '/usage/skills',
    );
    expect(component.getByRole('link', { name: 'Agents' })).toHaveAttribute(
      'href',
      '/usage/agents',
    );
    expect(component.getByRole('link', { name: 'Telemetry' })).toHaveAttribute(
      'href',
      '/usage/telemetry',
    );
  });
});
