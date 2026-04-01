import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalNavigation } from '../GlobalNavigation';
import type { GlobalNavigationProps } from '../GlobalNavigation';

describe('GlobalNavigation Component', () => {
  let component: RenderResult;
  let props: GlobalNavigationProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalNavigation {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders title heading', () => {
    expect(component.getByTestId('GlobalNavigation')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'GlobalNavigation' }),
    ).toBeInTheDocument();
  });
});
