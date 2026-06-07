import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PlanWorkflowConfigHooksEmpty } from '../PlanWorkflowConfigHooksEmpty';

describe('PlanWorkflowConfigHooksEmpty Component', () => {
  test('renders empty hooks message', () => {
    const Component = () => <PlanWorkflowConfigHooksEmpty />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByTestId('PlanWorkflowConfigHooksEmpty'),
    ).toBeInTheDocument();
    expect(screen.getByText(/No hooks configured/i)).toBeInTheDocument();
  });
});
