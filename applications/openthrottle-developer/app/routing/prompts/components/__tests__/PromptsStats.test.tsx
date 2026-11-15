import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PromptsStats } from '../PromptsStats';

describe('PromptsStats Component', () => {
  test('renders stat cards with titles and numeric values', () => {
    const Component = () => {
      return <PromptsStats countAgents={2} countSkills={5} total={12} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('PromptsStats')).toBeInTheDocument();
    expect(component.getByText('Agents-type prompts')).toBeInTheDocument();
    expect(component.getByText('Skills-type prompts')).toBeInTheDocument();
    expect(component.getByText('Total (this list)')).toBeInTheDocument();
    expect(component.getByText(/^2$/)).toBeInTheDocument();
    expect(component.getByText(/^5$/)).toBeInTheDocument();
    expect(component.getByText(/^12$/)).toBeInTheDocument();
  });
});
