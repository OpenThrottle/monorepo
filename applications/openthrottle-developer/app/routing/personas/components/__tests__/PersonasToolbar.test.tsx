import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PersonasToolbar } from '../PersonasToolbar';

describe('PersonasToolbar Component', () => {
  test('renders toolbar region and heading', () => {
    const Component = () => <PersonasToolbar />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('PersonasToolbar')).toBeInTheDocument();
    expect(screen.getByText(/read from/i)).toBeInTheDocument();
    expect(screen.getByText(/no in-app writes/i)).toBeInTheDocument();
  });
});
