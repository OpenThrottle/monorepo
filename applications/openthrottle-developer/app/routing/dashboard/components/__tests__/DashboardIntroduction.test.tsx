import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardIntroduction } from '../DashboardIntroduction';
import type { DashboardIntroductionProps } from '../DashboardIntroduction';

function renderWithProps(props: DashboardIntroductionProps): RenderResult {
  const Component = () => <DashboardIntroduction {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('DashboardIntroduction Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderWithProps({});
  });

  test('renders dashboard title and intro copy', () => {
    expect(component.getByTestId('DashboardIntroduction')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        /Get a pulse of all your Plans, Tasks, PR's, Prompts, Skills/,
      ),
    ).toBeInTheDocument();
  });
});
