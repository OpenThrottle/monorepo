import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeMoveFaster } from '../HomeMoveFaster';
import type { HomeMoveFasterProps } from '../HomeMoveFaster';

describe('HomeMoveFaster Component', () => {
  let component: RenderResult;
  let props: HomeMoveFasterProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeMoveFaster {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders CTA heading and link to pricing', () => {
    expect(component.getByTestId('HomeMoveFaster')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'Ready to Move Faster?' }),
    ).toBeInTheDocument();
    const tryNow = component.getByRole('link', { name: 'Try Now' });
    expect(tryNow).toHaveAttribute('href', '/pricing');
  });
});
