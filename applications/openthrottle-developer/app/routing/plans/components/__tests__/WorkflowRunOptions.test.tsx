import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkflowRunOptions } from '../WorkflowRunOptions';
import type { WorkflowRunOptionsProps } from '../WorkflowRunOptions';

describe('WorkflowRunOptions Component', () => {
  let component: RenderResult;
  let props: WorkflowRunOptionsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <WorkflowRunOptions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render scaffold region for workflow-ralph options', () => {
    expect(component.getByTestId('WorkflowRunOptions')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'WorkflowRunOptions' }),
    ).toBeInTheDocument();
  });
});
