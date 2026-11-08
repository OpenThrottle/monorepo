import type { RenderResult } from '@testing-library/react';
import { render, within } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { getPlanScheduledForTitle } from '~/routing/plans/utils/plan-scheduled-run-reason';

import type { PlanStatusBadgeProps } from '../PlanStatusBadge';
import { PlanStatusBadge } from '../PlanStatusBadge';

describe('PlanStatusBadge Component', () => {
  let component: RenderResult;
  let props: PlanStatusBadgeProps;

  beforeEach(() => {
    props = {
      status: 'IN_PROGRESS',
    };

    const Component = () => {
      return <PlanStatusBadge {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should display In Progress for IN_PROGRESS status', () => {
    expect(component.getByText('In Progress')).toBeInTheDocument();
  });

  test('should display Queued for QUEUED status', () => {
    props = {
      status: 'QUEUED',
    };

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return <PlanStatusBadge {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByText } = render(<RoutesStub />);

    expect(getByText('Queued')).toBeInTheDocument();
  });

  describe('a SCHEDULED plan', () => {
    const renderBadge = (badgeProps: PlanStatusBadgeProps): RenderResult => {
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => {
        return <PlanStatusBadge {...badgeProps} />;
      };
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      return render(<RoutesStub />);
    };

    test('names the scheduled run time in its tooltip', () => {
      const scheduledRunAt = '2026-11-08T17:00:00.000Z';
      const { container } = renderBadge({
        scheduledRunAt,
        status: 'SCHEDULED',
      });

      expect(within(container).getByTestId('PlanStatusBadge')).toHaveAttribute(
        'title',
        getPlanScheduledForTitle(scheduledRunAt),
      );
    });

    test('puts the tooltip on the link when the badge links to the filtered list', () => {
      const scheduledRunAt = '2026-11-08T17:00:00.000Z';
      const { container } = renderBadge({
        scheduledRunAt,
        status: 'SCHEDULED',
        to: '/plans?status=SCHEDULED',
      });

      const link = within(container).getByRole('link');
      expect(link).toHaveAttribute('href', '/plans?status=SCHEDULED');
      expect(link).toHaveAttribute(
        'title',
        getPlanScheduledForTitle(scheduledRunAt),
      );
    });

    test('carries no tooltip when the run time is unknown', () => {
      const { container } = renderBadge({ status: 'SCHEDULED' });

      expect(
        within(container).getByTestId('PlanStatusBadge'),
      ).not.toHaveAttribute('title');
    });
  });
});
