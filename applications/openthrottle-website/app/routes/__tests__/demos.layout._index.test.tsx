import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../demos.layout._index';

describe('routes/demos.layout._index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([{ Component, path: '/demos/layout' }]);

    component = render(<RoutesStub initialEntries={['/demos/layout']} />);
  });

  test('renders page heading', () => {
    expect(
      component.getByRole('heading', { name: 'Floor layout' }),
    ).toBeInTheDocument();
  });
});
