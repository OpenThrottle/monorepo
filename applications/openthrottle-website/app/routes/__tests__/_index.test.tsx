import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../_index';

describe('routes/_index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    // The home Component reads the `root` route loader via
    // `useRouteLoaderData('root')`, so it must render under a parent route whose
    // id is `root`. The loader only needs to supply `repo`, which seeds the
    // clone command shown on the page.
    const RoutesStub = createRoutesStub([
      {
        children: [{ Component, index: true }],
        id: 'root',
        loader: () => ({ repo: 'openthrottle/openthrottle' }),
        path: '/',
      },
    ]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders the public landing page with the GitHub CTA and clone command', async () => {
    // The landing page is now public (no beta gate): the "View on GitHub" CTA is
    // shown directly. `findByRole` waits for the stubbed route loader to resolve
    // past initial hydration.
    expect(
      await component.findByRole('link', { name: /view on github/i }),
    ).toBeInTheDocument();

    // The clone command is derived from the root loader's `repo` and rendered as
    // the label of the copy-to-clipboard button.
    expect(
      component.getByRole('button', {
        name: 'git clone https://github.com/openthrottle/openthrottle.git',
      }),
    ).toBeInTheDocument();

    // The pre-launch holding copy is gone now that the page is public.
    expect(component.queryByText("We're in private beta.")).toBeNull();
  });
});
