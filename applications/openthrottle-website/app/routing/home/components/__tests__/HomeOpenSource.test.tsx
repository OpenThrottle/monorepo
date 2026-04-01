import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeOpenSource } from '../HomeOpenSource';
import type { HomeOpenSourceProps } from '../HomeOpenSource';

describe('HomeOpenSource Component', () => {
  let component: RenderResult;
  let props: HomeOpenSourceProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeOpenSource {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders headline and open-source anchor id', () => {
    expect(component.getByTestId('HomeOpenSource')).toHaveAttribute(
      'id',
      'open-source',
    );
    expect(
      component.getByRole('heading', { name: 'Open Source, Free, Forever' }),
    ).toBeInTheDocument();
  });
});
