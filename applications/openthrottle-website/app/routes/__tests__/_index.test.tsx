import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../_index';

describe('routes/_index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    // The home Component reads the `root` route loader via
    // `useRouteLoaderData('root')`, so it must render under a parent route whose
    // id is `root`. The beta gate (`count >= 5` logo clicks) lives entirely in
    // this Component, so the parent loader only needs to supply `repo`.
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

  test('keeps the landing content gated behind 5 logo clicks', async () => {
    const user = userEvent.setup();

    // Pre-launch state: the private-beta holding copy is shown and the gated
    // landing content (the "View on GitHub" CTA) is not. `findByText` waits for
    // the stubbed route loader to resolve past initial hydration.
    expect(
      await component.findByText("We're in private beta."),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: /view on github/i }),
    ).toBeNull();

    // The onClick handler lives on the wrapping div; clicking the holding copy
    // (a child) bubbles up to it, so no element cast is needed.
    const gate = component.getByText('Check back soon for the public release.');

    // Four clicks is below the gate threshold — content stays hidden. Chained
    // off a single starting promise to keep the clicks sequential without an
    // `await` inside a loop.
    await [0, 1, 2, 3].reduce(
      (chain) => chain.then(() => user.click(gate)),
      Promise.resolve(),
    );
    expect(component.getByText("We're in private beta.")).toBeInTheDocument();

    // The fifth click trips `count >= 5` and reveals the landing content.
    await user.click(gate);
    expect(
      await component.findByRole('link', { name: /view on github/i }),
    ).toBeInTheDocument();
    expect(component.queryByText("We're in private beta.")).toBeNull();
  });
});
