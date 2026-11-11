import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLocation } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { Link } from '../Link';

describe('Link Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = (): React.ReactElement => {
      const location = useLocation();

      return (
        <>
          <Link className="uppercase" cta="Read more" to="/about" />
          <p data-testid="pathname">{location.pathname}</p>
        </>
      );
    };
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      { Component, path: '/about' },
    ]);

    component = render(<RoutesStub />);
  });

  test('renders a button-styled link to the target', async () => {
    const link = await component.findByRole('link', { name: 'Read more' });

    expect(link).toHaveAttribute('href', '/about');
    expect(link).toHaveAttribute('data-slot', 'button');
    expect(link).toHaveClass('uppercase');
  });

  test('navigates with React Router when clicked', async () => {
    await userEvent.click(
      await component.findByRole('link', { name: 'Read more' }),
    );

    expect(await component.findByTestId('pathname')).toHaveTextContent(
      '/about',
    );
  });
});
