import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardDailyStatsModal } from '../DashboardDailyStatsModal';
import type { DashboardDailyStatsModalProps } from '../DashboardDailyStatsModal';

function renderWithProps(
  props: DashboardDailyStatsModalProps,
  initialEntries: readonly string[],
): RenderResult {
  const Component = () => <DashboardDailyStatsModal {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[...initialEntries]} />);
}

describe('DashboardDailyStatsModal Component', () => {
  describe('when modal search param matches', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderWithProps({}, ['/?modal=daily-stats']);
    });

    test('renders modal title and body copy', () => {
      expect(
        component.getByRole('heading', {
          level: 2,
          name: 'Dashboard Daily Stats Modal',
        }),
      ).toBeInTheDocument();
      expect(
        component.getByText(/lorem ipsum dolor sit amet/i),
      ).toBeInTheDocument();
    });
  });

  describe('when modal search param does not match', () => {
    test('does not surface modal heading in the accessible tree', () => {
      const component = renderWithProps({}, ['/']);
      expect(
        component.queryByRole('heading', {
          name: 'Dashboard Daily Stats Modal',
        }),
      ).not.toBeInTheDocument();
    });
  });
});
