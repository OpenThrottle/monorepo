import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AgentsSectionQuickLinks } from '~/routing/agents/components/AgentsSectionQuickLinks';

describe('AgentsSectionQuickLinks', () => {
  test('renders links to Prompts, Skills, and Usage', () => {
    const router = createMemoryRouter(
      [
        {
          element: <AgentsSectionQuickLinks />,
          path: '/',
        },
      ],
      { initialEntries: ['/'] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText(/Agents workspace/i)).toBeInTheDocument();

    const prompts = screen.getByRole('link', { name: /^Prompts$/i });
    const skills = screen.getByRole('link', { name: /^Skills$/i });
    const usage = screen.getByRole('link', { name: /^Usage$/i });

    expect(prompts).toHaveAttribute('href', '/prompts');
    expect(skills).toHaveAttribute('href', '/skills');
    expect(usage).toHaveAttribute('href', '/usage');
  });
});
