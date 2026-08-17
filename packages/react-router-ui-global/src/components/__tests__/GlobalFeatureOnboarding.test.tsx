import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { Dialog, DialogContent } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { RocketIcon } from 'lucide-react';
import { beforeEach, describe, expect, test } from 'vitest';
import { GLOBAL_FEATURE_ONBOARDING_MODAL } from '../../config';
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

  test('keeps an internal secondary link in-app (no new tab)', () => {
    const withSecondary = renderComponent({
      content: {
        ...CONTENT,
        secondary: { label: 'Learn more', to: '/docs/things' },
      },
    });
    const secondary = withSecondary.getByRole('link', { name: 'Learn more' });
    expect(secondary).not.toHaveAttribute('target');
    expect(secondary).not.toHaveAttribute('rel');
  });

  test('renders an absolute secondary link as a new-tab anchor', () => {
    const withSecondary = renderComponent({
      content: {
        ...CONTENT,
        secondary: {
          label: 'Read the spec',
          to: 'https://agentskills.io/specification',
        },
      },
    });
    const secondary = withSecondary.getByRole('link', {
      name: 'Read the spec',
    });
    expect(secondary).toHaveAttribute(
      'href',
      'https://agentskills.io/specification',
    );
    expect(secondary).toHaveAttribute('target', '_blank');
    expect(secondary).toHaveAttribute('rel', 'noreferrer');
  });

  test('renders an absolute primary CTA as a new-tab anchor too', () => {
    const withExternalCta = renderComponent({
      content: {
        ...CONTENT,
        cta: { label: 'Open the docs', to: 'http://example.com/docs' },
      },
    });
    const cta = withExternalCta.getByRole('link', { name: 'Open the docs' });
    expect(cta).toHaveAttribute('href', 'http://example.com/docs');
    expect(cta).toHaveAttribute('target', '_blank');
  });
});

const renderDialog = (props: GlobalFeatureOnboardingProps): RenderResult => {
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = (): React.ReactElement => (
    <Dialog open={true}>
      <DialogContent>
        <GlobalFeatureOnboarding {...props} />
      </DialogContent>
    </Dialog>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('GlobalFeatureOnboarding renderAs="dialog"', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderDialog({ content: CONTENT, renderAs: 'dialog' });
  });

  test('exposes the title as the accessible dialog title', () => {
    const dialog = component.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(CONTENT.title);
  });

  test('still renders the onboarding root and every body section', () => {
    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.getByText(CONTENT.tagline)).toBeInTheDocument();
    expect(component.getByText(CONTENT.whatItIs)).toBeInTheDocument();
    for (const step of CONTENT.steps) {
      expect(component.getByText(step)).toBeInTheDocument();
    }
  });

  test('does not render the Card chrome in dialog mode', () => {
    expect(component.getByTestId('GlobalFeatureOnboarding')).not.toHaveClass(
      'bg-card',
    );
  });

  test('still renders the primary CTA link with the correct href', () => {
    const cta = component.getByRole('link', { name: CONTENT.cta.label });
    expect(cta).toHaveAttribute('href', CONTENT.cta.to);
  });
});

describe('GLOBAL_FEATURE_ONBOARDING_MODAL', () => {
  test('is the single source of truth for the modal param/value', () => {
    expect(GLOBAL_FEATURE_ONBOARDING_MODAL).toStrictEqual({
      param: 'modal',
      value: 'onboarding',
    });
  });
});
