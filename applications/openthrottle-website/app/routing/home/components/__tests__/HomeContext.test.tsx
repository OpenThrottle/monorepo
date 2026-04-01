import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeContext } from '../HomeContext';
import type { HomeContextProps } from '../HomeContext';

describe('HomeContext Component', () => {
  let component: RenderResult;
  let props: HomeContextProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeContext {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders features heading and anchor id', () => {
    expect(component.getByTestId('HomeContext')).toHaveAttribute(
      'id',
      'features',
    );
    expect(
      component.getByRole('heading', {
        name: 'All the information you need, in one place',
      }),
    ).toBeInTheDocument();
  });
});
