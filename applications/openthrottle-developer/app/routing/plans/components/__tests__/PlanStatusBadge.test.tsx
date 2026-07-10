import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanStatusBadge } from '../PlanStatusBadge';
import type { PlanStatusBadgeProps } from '../PlanStatusBadge';

describe('PlanStatusBadge Component', () => {
  let component: RenderResult;
  let props: PlanStatusBadgeProps;

  beforeEach(() => {
    props = {
      status: 'IN_PROGRESS',
    };

    const Component = () => <PlanStatusBadge {...props} />;
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
    const Component = () => <PlanStatusBadge {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByText } = render(<RoutesStub />);

    expect(getByText('Queued')).toBeInTheDocument();
  });
});
