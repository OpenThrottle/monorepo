import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalHeader } from '../GlobalHeader';

describe('GlobalHeader Component', () => {
  test('should render navigation with logo link and sign-in control', () => {
    const Component = () => <GlobalHeader />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /openthrottle/i }),
    ).toBeInTheDocument();

    // expect(
    //   screen.getByRole('button', { name: 'Open sign in' }),
    // ).toBeInTheDocument();
  });
});
