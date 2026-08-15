import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { RocketIcon } from 'lucide-react';
import { afterEach, describe, expect, test } from 'vitest';
import { GlobalFeatureOnboardingModal } from '../GlobalFeatureOnboardingModal';
import type { GlobalFeatureOnboardingContent } from '../GlobalFeatureOnboarding';

const CONTENT: GlobalFeatureOnboardingContent = {
  cta: { label: 'Create your first thing', to: '/things/new' },
  icon: RocketIcon,
  internalUsage: 'We use things every day to ship faster.',
  steps: ['Step one', 'Step two', 'Step three'],
  tagline: 'A one-line hook that sells the feature.',
  title: 'Things',
  useCases: ['Use case alpha', 'Use case beta', 'Use case gamma'],
  whatItIs: 'Things are the unit of doing things.',
};

const renderModal = (initialEntry: string): RenderResult => {
  const Component = (): React.ReactElement => (
    <GlobalFeatureOnboardingModal content={CONTENT} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[initialEntry]} />);
};

describe('GlobalFeatureOnboardingModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('does not render the onboarding content without ?modal=onboarding', () => {
    const component = renderModal('/');
    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
    expect(component.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders the onboarding content when ?modal=onboarding is present', () => {
    const component = renderModal('/?modal=onboarding');
    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.getByRole('dialog')).toHaveAccessibleName(CONTENT.title);
    expect(
      component.getByRole('link', { name: CONTENT.cta.label }),
    ).toHaveAttribute('href', CONTENT.cta.to);
  });

  test('does not open for a different modal value', () => {
    const component = renderModal('/?modal=somethingElse');
    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
  });

  test('exposes its modal key as a static property', () => {
    expect(GlobalFeatureOnboardingModal.key).toBe('onboarding');
  });
});
