import * as FEATURE_FLAGS from '@openthrottle/react-router-utils/src/config/features';
import { screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsFeatureFlags } from '../SettingsFeatureFlags';

describe('SettingsFeatureFlags Component', () => {
  test('renders feature flag keys and devtools guidance', () => {
    renderRoutesStub(<SettingsFeatureFlags />);

    expect(screen.getByText('Feature flags')).toBeInTheDocument();

    for (const key of Object.keys(FEATURE_FLAGS)) {
      expect(screen.getByText(`${key}:`)).toBeInTheDocument();
    }
  });
});
