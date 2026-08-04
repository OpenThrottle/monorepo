import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { RolloutProvider } from '@openthrottle/react-router-rollout';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { developerRolloutFlags } from '~/global/data/data.rollout-flags';
import { RolloutSdkHydrationStatus } from '../RolloutSdkHydrationStatus';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';

const renderWithEvaluations = (
  initialEvaluations: React.ComponentProps<
    typeof RolloutProvider
  >['initialEvaluations'],
): RenderResult => {
  const Component = () => (
    <RolloutProvider
      applicationKey="openthrottle-developer"
      fetchEvaluations={vi.fn(async () => [])}
      flags={developerRolloutFlags}
      initialEvaluations={initialEvaluations}
    >
      <RolloutSdkHydrationStatus />
    </RolloutProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('RolloutSdkHydrationStatus Component', () => {
  let component: RenderResult;

  describe('when beta is enabled', () => {
    beforeEach(() => {
      component = renderWithEvaluations([
        {
          enabled: true,
          key: 'beta',
          kind: 'boolean',
          valueJson: 'true',
        },
      ]);
    });

    test('renders hydration status from shared copy', () => {
      const status = component.getByTestId('RolloutSdkHydrationStatus');
      expect(status).toBeInTheDocument();
      expect(status).toHaveTextContent(ROLLOUT_COPY.sdkHydrationPrefix);
      expect(status).toHaveAttribute(
        'data-application-key',
        'openthrottle-developer',
      );
    });
  });

  describe('when beta is disabled', () => {
    beforeEach(() => {
      component = renderWithEvaluations([
        {
          enabled: false,
          key: 'beta',
          kind: 'boolean',
          valueJson: 'false',
        },
      ]);
    });

    test('does not render the status strip', () => {
      expect(component.queryByTestId('RolloutSdkHydrationStatus')).toBeNull();
    });
  });
});
