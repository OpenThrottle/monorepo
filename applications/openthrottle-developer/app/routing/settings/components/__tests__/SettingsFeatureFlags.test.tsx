import { FEATURE_FLAGS } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsFeatureFlags } from '../SettingsFeatureFlags';

describe('SettingsFeatureFlags Component', () => {
  test('renders feature flag keys and devtools guidance', () => {
    const component = renderRoutesStub(<SettingsFeatureFlags />);

    expect(component.getByText('Feature flags')).toBeInTheDocument();

    for (const key of Object.keys(FEATURE_FLAGS)) {
      expect(component.getByText(`${key}:`)).toBeInTheDocument();
    }
  });
});
