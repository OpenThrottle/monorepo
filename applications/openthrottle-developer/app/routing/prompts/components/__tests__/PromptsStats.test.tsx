import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PromptsStats } from '../PromptsStats';

describe('PromptsStats Component', () => {
  test('renders stat cards with titles and numeric values', () => {
    const Component = () => (
      <PromptsStats countAgents={2} countSkills={5} total={12} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('PromptsStats')).toBeInTheDocument();
    expect(screen.getByText('Agents-type prompts')).toBeInTheDocument();
    expect(screen.getByText('Skills-type prompts')).toBeInTheDocument();
    expect(screen.getByText('Total (this list)')).toBeInTheDocument();
    expect(screen.getByText(/^2$/)).toBeInTheDocument();
    expect(screen.getByText(/^5$/)).toBeInTheDocument();
    expect(screen.getByText(/^12$/)).toBeInTheDocument();
  });
});
