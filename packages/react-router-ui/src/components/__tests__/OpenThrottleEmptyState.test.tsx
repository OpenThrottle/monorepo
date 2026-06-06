import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleEmptyState } from '../OpenThrottleEmptyState';
import type { OpenThrottleEmptyStateProps } from '../OpenThrottleEmptyState';

describe('OpenThrottleEmptyState Component', () => {
  let component: RenderResult;
  let props: OpenThrottleEmptyStateProps;

  beforeEach(() => {
    props = { description: '', title: '' };

    const Component = () => <OpenThrottleEmptyState {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders empty state container with title and description regions', () => {
    expect(component.getByTestId('OpenThrottleEmptyState')).toBeInTheDocument();
    expect(component.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(component.getByRole('paragraph')).toBeInTheDocument();
  });
});
