import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbar } from '../PlanToolbar';
import type { PlanToolbarProps } from '../PlanToolbar';

describe('PlanToolbar Component', () => {
  let component: RenderResult;
  let props: PlanToolbarProps;

  beforeEach(() => {
    props = { planId: 'test-plan-id' };

    const Component = () => <PlanToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render actions and links scoped to planId', () => {
    expect(component.getByTestId('PlanToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /mark complete/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /^actions$/i }),
    ).toBeInTheDocument();
  });

  test('should link to workflow CLI options anchor on the plan page', () => {
    const link = component.getByRole('link', { name: 'Workflow CLI options' });
    expect(link).toHaveAttribute('href', '#workflow-run-options');
  });
});
