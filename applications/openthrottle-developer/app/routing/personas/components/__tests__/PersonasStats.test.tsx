import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PersonasStats } from '../PersonasStats';

describe('PersonasStats Component', () => {
  test('renders stats region', () => {
    const Component = () => <PersonasStats />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('PersonasStats')).toBeInTheDocument();
  });
});
