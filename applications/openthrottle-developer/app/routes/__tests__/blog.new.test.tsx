import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useParams } from 'react-router';
import { describe, expect, test } from 'vitest';

import Component from '../blog.new';

const EditorProbe = (): React.ReactElement => {
  const { postId } = useParams();

  return <p>editor for {postId}</p>;
};

describe('routes/blog.new.tsx', () => {
  test('renders a one-button form that creates the draft', async () => {
    let posted = 0;
    const Stub = createRoutesStub([
      {
        Component,
        action: () => {
          posted += 1;

          return new Response(null, {
            headers: { Location: '/blog/post-9' },
            status: 302,
          });
        },
        loader: () => ({}),
        path: '/blog/new',
      },
      { Component: EditorProbe, path: '/blog/:postId' },
    ]);
    const component = render(
      <TooltipProvider>
        <Stub initialEntries={['/blog/new']} />
      </TooltipProvider>,
    );
    const user = userEvent.setup();

    await user.click(
      await component.findByRole('button', { name: 'Create draft' }),
    );

    expect(await component.findByText('editor for post-9')).toBeInTheDocument();
    expect(posted).toBe(1);
  });

  test('shows why the draft could not be created', async () => {
    const Stub = createRoutesStub([
      {
        Component,
        action: () => ({ error: 'No free slug.' }),
        loader: () => ({}),
        path: '/blog/new',
      },
    ]);
    const component = render(
      <TooltipProvider>
        <Stub initialEntries={['/blog/new']} />
      </TooltipProvider>,
    );
    const user = userEvent.setup();

    await user.click(
      await component.findByRole('button', { name: 'Create draft' }),
    );

    expect(await component.findByRole('alert')).toHaveTextContent(
      'No free slug.',
    );
  });
});
