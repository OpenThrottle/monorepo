import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeComposerSkeleton } from './HomeComposerSkeleton';
import type { HomeComposerSkeletonProps } from './HomeComposerSkeleton';

describe('HomeComposerSkeleton Component', () => {
  let component: RenderResult;
  let props: HomeComposerSkeletonProps;

  beforeEach(() => {
    props = {};
  });

  test('renders the busy placeholder with the discovering-models copy', () => {
    component = render(<HomeComposerSkeleton {...props} />);

    const skeleton = component.getByTestId('HomeComposerSkeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(component.getByText('Discovering models…')).toBeInTheDocument();
  });

  test('merges a custom className onto the root element', () => {
    props = { className: 'custom-class' };
    component = render(<HomeComposerSkeleton {...props} />);

    expect(component.getByTestId('HomeComposerSkeleton')).toHaveClass(
      'custom-class',
    );
  });
});
