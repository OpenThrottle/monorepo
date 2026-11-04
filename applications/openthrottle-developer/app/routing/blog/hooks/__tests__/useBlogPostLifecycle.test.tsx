import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';
import type { BlogPostLifecycleResult } from '~/routing/blog/types';

import { useBlogPostLifecycle } from '../useBlogPostLifecycle';

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: toastError, success: toastSuccess }),
}));

const Probe = (): React.ReactElement => {
  const { archive, isPending, publish, unpublish } = useBlogPostLifecycle();

  return (
    <>
      <button onClick={() => publish(null)} type="button">
        publish now
      </button>
      <button onClick={() => publish('2099-06-15T17:30:00.000Z')} type="button">
        schedule
      </button>
      <button onClick={unpublish} type="button">
        unpublish
      </button>
      <button onClick={archive} type="button">
        archive
      </button>
      <p>{isPending ? 'pending' : 'idle'}</p>
    </>
  );
};

const renderProbe = (
  result: BlogPostLifecycleResult,
  bodies: unknown[],
): ReturnType<typeof render> => {
  const Stub = createRoutesStub([
    {
      Component: Probe,
      action: async ({ request }: { readonly request: Request }) => {
        bodies.push(await request.json());

        return result;
      },
      path: '/',
    },
  ]);

  return render(<Stub />);
};

describe('useBlogPostLifecycle', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  test('publish now posts a null date and toasts "published"', async () => {
    const bodies: unknown[] = [];
    const component = renderProbe(
      { outcome: 'published', publishedAt: null, state: BlogPostState.Live },
      bodies,
    );

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: 'publish now' }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    expect(bodies).toEqual([{ intent: 'publish', publishedAt: null }]);
    expect(toastSuccess).toHaveBeenCalledWith('Post published');
  });

  test('a scheduled result toasts "scheduled"', async () => {
    const bodies: unknown[] = [];
    const component = renderProbe(
      {
        outcome: 'published',
        publishedAt: '2099-06-15T17:30:00.000Z',
        state: BlogPostState.Scheduled,
      },
      bodies,
    );

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: 'schedule' }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Post scheduled'),
    );
    expect(bodies).toEqual([
      { intent: 'publish', publishedAt: '2099-06-15T17:30:00.000Z' },
    ]);
  });

  test.each([
    ['unpublish', { outcome: 'unpublished' }, 'Post moved back to draft'],
    ['archive', { outcome: 'archived' }, 'Post archived'],
  ] as const)('%s toasts %s', async (name, result, message) => {
    const component = renderProbe(result, []);

    await userEvent.setup().click(component.getByRole('button', { name }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(message));
  });

  test('the not-found branch toasts the server message', async () => {
    const component = renderProbe(
      { message: 'Blog post "x" was not found.', outcome: 'lifecycleNotFound' },
      [],
    );

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: 'archive' }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Blog post "x" was not found.'),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
