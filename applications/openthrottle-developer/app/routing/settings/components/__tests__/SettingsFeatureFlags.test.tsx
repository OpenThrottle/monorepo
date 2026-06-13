import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import * as FEATURE_FLAGS from '@openthrottle/react-router-utils/src/config/features';
import { SettingsFeatureFlags } from '../SettingsFeatureFlags';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('SettingsFeatureFlags Component', () => {
  test('renders feature flag keys and devtools guidance', () => {
    renderRoutesStub(<SettingsFeatureFlags />);

    expect(screen.getByText('Feature flags')).toBeInTheDocument();

    for (const key of Object.keys(FEATURE_FLAGS)) {
      expect(screen.getByText(`${key}:`)).toBeInTheDocument();
    }

    expect(
      screen.getAllByText(/REACT_ROUTER_DEV_TOOLS/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/APP_ENABLE_ANALYTICS/i).length).toBeGreaterThan(
      0,
    );
  });
});
