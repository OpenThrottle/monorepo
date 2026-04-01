import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeWorkflows } from '../HomeWorkflows';
import type { HomeWorkflowsProps } from '../HomeWorkflows';

describe('HomeWorkflows Component', () => {
  let component: RenderResult;
  let props: HomeWorkflowsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeWorkflows {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders section heading and anchor id', () => {
    const section = component.getByTestId('HomeWorkflows');
    expect(section).toHaveAttribute('id', 'how-it-works');
    expect(
      component.getByRole('heading', { name: 'Feedback-Driven Development' }),
    ).toBeInTheDocument();
  });
});
