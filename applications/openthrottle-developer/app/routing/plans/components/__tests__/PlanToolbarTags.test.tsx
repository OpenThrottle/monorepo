import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { PlanToolbarTags } from '../PlanToolbarTags';
import type { PlanToolbarTagsProps } from '../PlanToolbarTags';

const renderTags = (props: PlanToolbarTagsProps) => {
  const Component = () => <PlanToolbarTags {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const baseProps: PlanToolbarTagsProps = {
  onAddTag: vi.fn(),
  onRemoveTag: vi.fn(),
  pending: false,
  tags: [{ dimension: 'domain', source: 'human', tag: 'backend' }],
  vocabulary: Promise.resolve([{ dimension: 'domain', tag: 'frontend' }]),
};

describe('PlanToolbarTags Component', () => {
  test('renders the chips once the deferred vocabulary resolves', async () => {
    const component = renderTags(baseProps);

    expect(await component.findByTestId('PlanTagChips')).toBeInTheDocument();
    expect(component.getByText('backend')).toBeInTheDocument();
  });

  test('renders the skeleton, not the chips, while the vocabulary is pending', () => {
    const component = renderTags({
      ...baseProps,
      vocabulary: new Promise(() => {}),
    });

    expect(
      component.getByTestId('PlanToolbarTagsSkeleton'),
    ).toBeInTheDocument();
    expect(component.queryByTestId('PlanTagChips')).not.toBeInTheDocument();
  });

  // The toolbar hands these down optionally, so the guard lives here rather than
  // as a four-clause ternary at the call site.
  test('renders nothing when the chips are missing a required input', () => {
    const component = renderTags({ ...baseProps, vocabulary: undefined });

    expect(component.queryByTestId('PlanTagChips')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('PlanToolbarTagsSkeleton'),
    ).not.toBeInTheDocument();
  });
});
