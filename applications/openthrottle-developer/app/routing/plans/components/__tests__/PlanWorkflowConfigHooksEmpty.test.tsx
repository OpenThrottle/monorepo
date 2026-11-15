import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PlanWorkflowConfigHooksEmpty } from '../PlanWorkflowConfigHooksEmpty';

describe('PlanWorkflowConfigHooksEmpty Component', () => {
  test('renders empty hooks message', () => {
    const Component = () => {
      return <PlanWorkflowConfigHooksEmpty />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('PlanWorkflowConfigHooksEmpty'),
    ).toBeInTheDocument();
    expect(component.getByText(/No hooks configured/i)).toBeInTheDocument();
  });
});
