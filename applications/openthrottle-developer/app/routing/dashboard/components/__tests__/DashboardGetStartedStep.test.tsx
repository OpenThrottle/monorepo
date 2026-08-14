import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DashboardGetStartedStep } from '../DashboardGetStartedStep';
import type { DashboardGetStartedStepProps } from '../DashboardGetStartedStep';

const baseProps: DashboardGetStartedStepProps = {
  complete: false,
  cta: 'Open settings',
  description: 'Connect your token to unlock stats.',
  href: '/settings',
  title: 'Connect your GitHub token',
};

const renderStep = (
  overrides: Partial<DashboardGetStartedStepProps> = {},
): RenderResult => {
  const props = { ...baseProps, ...overrides };
  const Component = () => (
    <ul>
      <DashboardGetStartedStep {...props} />
    </ul>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('DashboardGetStartedStep Component', () => {
  test('an incomplete step shows its title, description, and a deep-link CTA', () => {
    const component = renderStep({ complete: false });

    const row = component.getByTestId('DashboardGetStartedStep');
    expect(row).toHaveAttribute('data-complete', 'false');
    expect(component.getByText(baseProps.title)).toBeInTheDocument();
    expect(component.getByText(baseProps.description)).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /Open settings/ }),
    ).toHaveAttribute('href', '/settings');
  });

  test('a complete step drops the CTA and marks itself done', () => {
    const component = renderStep({ complete: true });

    expect(component.getByTestId('DashboardGetStartedStep')).toHaveAttribute(
      'data-complete',
      'true',
    );
    expect(component.queryByRole('link')).not.toBeInTheDocument();
  });
});
