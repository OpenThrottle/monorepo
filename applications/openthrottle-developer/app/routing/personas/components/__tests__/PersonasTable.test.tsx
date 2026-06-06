import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PersonasTable } from '../PersonasTable';

describe('PersonasTable Component', () => {
  test('renders table region', () => {
    const Component = () => <PersonasTable />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('PersonasTable')).toBeInTheDocument();
  });
});
