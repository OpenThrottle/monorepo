import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../_index';

describe('routes/_index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      {
        Component,
        index: true,
        loader: () => ({
          introduction: 'This is a test intro',
          repo: 'openthrottle/openthrottle',
        }),
        path: '/',
      },
    ]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders the public landing page with the GitHub CTA and clone command', async () => {
    expect(
      await component.findByRole('link', { name: /view on github/i }),
    ).toBeInTheDocument();

    expect(
      component.getByRole('button', {
        name: 'git clone https://github.com/openthrottle/openthrottle.git',
      }),
    ).toBeInTheDocument();

    // The pre-launch holding copy is gone now that the page is public.
    expect(component.queryByText("We're in private beta.")).toBeNull();
  });
});
