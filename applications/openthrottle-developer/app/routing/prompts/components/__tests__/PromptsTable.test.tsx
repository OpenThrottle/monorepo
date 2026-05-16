import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PromptsTable } from '../PromptsTable';

describe('PromptsTable Component', () => {
  test('renders placeholder table region', () => {
    const Component = () => <PromptsTable />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('PromptsTable')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'PromptsTable' }),
    ).toBeInTheDocument();
  });
});
