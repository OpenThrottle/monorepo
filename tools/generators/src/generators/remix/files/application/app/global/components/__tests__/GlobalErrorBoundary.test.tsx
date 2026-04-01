import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import type { GlobalErrorBoundaryProps } from '../GlobalErrorBoundary';

describe('GlobalErrorBoundary Component', () => {
  let component: RenderResult;
  let props: GlobalErrorBoundaryProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
