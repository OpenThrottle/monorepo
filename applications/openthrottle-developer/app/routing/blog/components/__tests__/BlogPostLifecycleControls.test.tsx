import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';

import type { BlogPostLifecycleControlsProps } from '../BlogPostLifecycleControls';
import { BlogPostLifecycleControls } from '../BlogPostLifecycleControls';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

const PUBLISHED_AT = '2026-11-01T17:00:00.000Z';

const renderControls = (
  overrides: Partial<BlogPostLifecycleControlsProps> = {},
  bodies: unknown[] = [],
): RenderResult => {
  const controlProps: BlogPostLifecycleControlsProps = {
    canWrite: true,
    isDirty: false,
    post: { publishedAt: null, state: BlogPostState.Draft },
    ...overrides,
  };
  const Stub = createRoutesStub([
    {
      Component: () => <BlogPostLifecycleControls {...controlProps} />,
      action: async ({ request }: { readonly request: Request }) => {
        bodies.push(await request.json());

        return { outcome: 'unpublished' };
      },
      path: '/',
    },
  ]);

  return render(<Stub />);
};

const buttonNames = (component: RenderResult): string[] =>
  component
    .getAllByRole('button')
    .map((button) => button.textContent?.trim() ?? '');

describe('BlogPostLifecycleControls Component', () => {
  test('renders nothing without blog:write', () => {
    const component = renderControls({ canWrite: false });

    expect(
      component.queryByTestId('BlogPostLifecycleControls'),
    ).not.toBeInTheDocument();
    expect(component.queryAllByRole('button')).toHaveLength(0);
  });

  test.each([
    [BlogPostState.Draft, null, ['Publish']],
    [BlogPostState.Scheduled, PUBLISHED_AT, ['Reschedule', 'Unpublish']],
    [BlogPostState.Live, PUBLISHED_AT, ['Unpublish', 'Archive']],
    [BlogPostState.Archived, PUBLISHED_AT, ['Publish', 'Move to draft']],
  ])('%s offers %j', (state, publishedAt, expected) => {
    const component = renderControls({ post: { publishedAt, state } });

    expect(buttonNames(component)).toEqual(expected);
  });

  test('a scheduled post says when it goes live; other states do not', () => {
    const scheduled = renderControls({
      post: { publishedAt: PUBLISHED_AT, state: BlogPostState.Scheduled },
    });

    expect(scheduled.getByTestId('BlogPostScheduledFor')).toHaveTextContent(
      /^Scheduled for .+ \(.+\)$/,
    );
    scheduled.unmount();

    const live = renderControls({
      post: { publishedAt: PUBLISHED_AT, state: BlogPostState.Live },
    });

    expect(live.queryByTestId('BlogPostScheduledFor')).not.toBeInTheDocument();
  });

  test('unsaved edits disable every control and say why', () => {
    const component = renderControls({
      isDirty: true,
      post: { publishedAt: PUBLISHED_AT, state: BlogPostState.Live },
    });

    expect(component.getByText('Save your changes first')).toBeInTheDocument();
    component
      .getAllByRole('button')
      .forEach((button) => expect(button).toBeDisabled());
  });

  test('Unpublish asks first, then posts the unpublish intent', async () => {
    const bodies: unknown[] = [];
    const component = renderControls(
      { post: { publishedAt: PUBLISHED_AT, state: BlogPostState.Live } },
      bodies,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Unpublish' }));
    expect(bodies).toHaveLength(0);
    await user.click(component.getByRole('button', { name: 'Unpublish post' }));

    await waitFor(() => expect(bodies).toEqual([{ intent: 'unpublish' }]));
  });

  test('Archive asks first, then posts the archive intent', async () => {
    const bodies: unknown[] = [];
    const component = renderControls(
      { post: { publishedAt: PUBLISHED_AT, state: BlogPostState.Live } },
      bodies,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Archive' }));
    await user.click(component.getByRole('button', { name: 'Archive post' }));

    await waitFor(() => expect(bodies).toEqual([{ intent: 'archive' }]));
  });

  test('cancelling the confirmation sends nothing', async () => {
    const bodies: unknown[] = [];
    const component = renderControls(
      { post: { publishedAt: PUBLISHED_AT, state: BlogPostState.Live } },
      bodies,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Archive' }));
    await user.click(component.getByRole('button', { name: 'Cancel' }));

    expect(bodies).toHaveLength(0);
    expect(component.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('Schedule posts a UTC timestamp', async () => {
    const bodies: unknown[] = [];
    const component = renderControls({}, bodies);
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Publish' }));
    await user.type(
      component.getByLabelText('Go-live date and time'),
      '2099-06-15T10:30',
    );
    await user.click(component.getByRole('button', { name: 'Schedule' }));

    await waitFor(() =>
      expect(bodies).toEqual([
        {
          intent: 'publish',
          publishedAt: new Date(2099, 5, 15, 10, 30).toISOString(),
        },
      ]),
    );
  });
});
