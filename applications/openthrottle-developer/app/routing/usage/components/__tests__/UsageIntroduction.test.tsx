import { screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { UsageIntroduction } from '../UsageIntroduction';

describe('UsageIntroduction Component', () => {
  test('renders Usage heading and range copy', () => {
    renderRoutesStub(<UsageIntroduction rangeDays={14} />);

    expect(screen.getByRole('heading', { name: 'Usage' })).toBeInTheDocument();
    expect(
      screen.getByText(/Usage metrics for this portal over the last 14 days/),
    ).toBeInTheDocument();
  });
});
