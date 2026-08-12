import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TaskDetailRouteHeader } from './TaskDetailRouteHeader';
import type { TaskDetailRouteHeaderProps } from './TaskDetailRouteHeader';

describe('TaskDetailRouteHeader Component', () => {
  let component: RenderResult;
  let props: TaskDetailRouteHeaderProps;

  const renderHeader = (): RenderResult => {
    const RoutesStub = createRoutesStub([
      { Component: () => <TaskDetailRouteHeader {...props} />, path: '/' },
    ]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = { status: 'IN_PROGRESS', title: 'Fix the flaky test' };
    component = renderHeader();
  });

  test('renders the task title', () => {
    expect(component.getByText('Fix the flaky test')).toBeInTheDocument();
  });

  test('renders a PlanStatusBadge for a known plan-status key', () => {
    expect(component.getByTestId('PlanStatusBadge')).toBeInTheDocument();
    expect(component.getByText('In Progress')).toBeInTheDocument();
  });

  test('falls back to a raw badge for an unmapped status', () => {
    component.unmount();
    props = { status: 'CUSTOM_STATUS', title: 'Some task' };
    component = renderHeader();

    expect(component.queryByTestId('PlanStatusBadge')).not.toBeInTheDocument();
    expect(component.getByText('CUSTOM_STATUS')).toBeInTheDocument();
  });
});
