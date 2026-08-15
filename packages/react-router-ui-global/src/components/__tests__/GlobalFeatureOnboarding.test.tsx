import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { RocketIcon } from 'lucide-react';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalFeatureOnboarding } from '../GlobalFeatureOnboarding';
import type {
  GlobalFeatureOnboardingContent,
  GlobalFeatureOnboardingProps,
} from '../GlobalFeatureOnboarding';

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

const renderComponent = (props: GlobalFeatureOnboardingProps): RenderResult => {
  const Component = (): React.ReactElement => (
    <GlobalFeatureOnboarding {...props} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('GlobalFeatureOnboarding Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderComponent({ content: CONTENT });
  });

  test('renders the root, title and tagline', () => {
    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.getByText(CONTENT.title)).toBeInTheDocument();
    expect(component.getByText(CONTENT.tagline)).toBeInTheDocument();
  });

  test('renders whatItIs and internalUsage', () => {
    expect(component.getByText(CONTENT.whatItIs)).toBeInTheDocument();
    expect(component.getByText(CONTENT.internalUsage)).toBeInTheDocument();
  });

  test('renders every use-case', () => {
    for (const useCase of CONTENT.useCases) {
      expect(component.getByText(useCase)).toBeInTheDocument();
    }
  });

  test('renders every quick-start step', () => {
    for (const step of CONTENT.steps) {
      expect(component.getByText(step)).toBeInTheDocument();
    }
  });

  test('renders the primary CTA link with the correct href', () => {
    const cta = component.getByRole('link', { name: CONTENT.cta.label });
    expect(cta).toHaveAttribute('href', CONTENT.cta.to);
  });

  test('does not render a secondary link when none is provided', () => {
    expect(
      component.queryByRole('link', { name: /learn more/i }),
    ).not.toBeInTheDocument();
  });

  test('renders the secondary link only when provided', () => {
    const withSecondary = renderComponent({
      content: {
        ...CONTENT,
        secondary: { label: 'Learn more', to: '/docs/things' },
      },
    });
    const secondary = withSecondary.getByRole('link', { name: 'Learn more' });
    expect(secondary).toHaveAttribute('href', '/docs/things');
  });
});
