import { render } from '@testing-library/react';
import * as React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, test } from 'vitest';

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

    const component = render(<RouterProvider router={router} />);

    expect(component.getByText(/Agents workspace/i)).toBeInTheDocument();

    const prompts = component.getByRole('link', { name: /^Prompts$/i });
    const skills = component.getByRole('link', { name: /^Skills$/i });
    const usage = component.getByRole('link', { name: /^Usage$/i });

    expect(prompts).toHaveAttribute('href', '/prompts');
    expect(skills).toHaveAttribute('href', '/skills');
    expect(usage).toHaveAttribute('href', '/usage');
  });
});
