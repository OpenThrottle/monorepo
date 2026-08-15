import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { GlobalFeatureOnboardingTrigger } from '../GlobalFeatureOnboardingTrigger';
import type { GlobalFeatureOnboardingTriggerProps } from '../GlobalFeatureOnboardingTrigger';

function Harness(
  props: GlobalFeatureOnboardingTriggerProps,
): React.ReactElement {
  const [searchParams] = useSearchParams();

  return (
    <div>
      <span data-testid="qs">{searchParams.toString()}</span>
      <GlobalFeatureOnboardingTrigger {...props} />
    </div>
  );
}

describe('GlobalFeatureOnboardingTrigger Component', () => {
  let component: RenderResult;
  let props: GlobalFeatureOnboardingTriggerProps;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    props = {};

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders an accessible trigger button with the default label', () => {
    const trigger = component.getByTestId('GlobalFeatureOnboardingTrigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-label', 'How it works');
    expect(trigger).toHaveTextContent('How it works');
  });

  test('sets modal=onboarding in the URL when clicked', async () => {
    const user = userEvent.setup();

    expect(component.getByTestId('qs')).toHaveTextContent('');

    await user.click(component.getByTestId('GlobalFeatureOnboardingTrigger'));

    const qs = new URLSearchParams(
      component.getByTestId('qs').textContent ?? '',
    );
    expect(qs.get('modal')).toBe('onboarding');
  });

  test('preserves other search params already present in the URL', async () => {
    cleanup();
    const user = userEvent.setup();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(
      <RoutesStub initialEntries={['/?keep=1']} />,
    );

    await user.click(getByTestId('GlobalFeatureOnboardingTrigger'));

    const qs = new URLSearchParams(getByTestId('qs').textContent ?? '');
    expect(qs.get('modal')).toBe('onboarding');
    expect(qs.get('keep')).toBe('1');
  });

  test('renders a custom label when provided', () => {
    cleanup();
    props = { label: 'Learn Rules' };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('GlobalFeatureOnboardingTrigger')).toHaveTextContent(
      'Learn Rules',
    );
  });

  test('exposes its modal key as a static property', () => {
    expect(GlobalFeatureOnboardingTrigger.key).toBe('onboarding');
  });
});
