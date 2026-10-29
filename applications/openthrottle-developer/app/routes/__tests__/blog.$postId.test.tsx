import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/blog.$postId';
import {
  MOCK_BLOG_AUTHORS,
  MOCK_BLOG_TAGS,
  MOCK_EDITOR_ARCHIVED,
  MOCK_EDITOR_DRAFT,
  MOCK_EDITOR_LIVE,
  MOCK_EDITOR_SCHEDULED,
} from '~/routing/blog/data/mock.blog-posts';
import type {
  BlogEditorPost,
  BlogPostLifecycleRequest,
  BlogPostLifecycleResult,
  BlogPostSaveRequest,
  BlogPostSaveResult,
} from '~/routing/blog/types';
import { parseBlogPostSaveRequest } from '~/routing/blog/utils/editor';
import {
  isBlogPostLifecycleBody,
  parseBlogPostLifecycleRequest,
} from '~/routing/blog/utils/lifecycle';

import Component, { shouldRevalidate } from '../blog.$postId';

// Monaco cannot boot under jsdom; a textarea keeps the same value/onChange contract.
vi.mock('@openthrottle/react-router-editor', () => ({
  EditorWindow: (props: {
    readonly onChange?: (value: string | undefined) => void;
    readonly value?: string;
  }) => (
    <textarea
      aria-label="Markdown body"
      onChange={(event) => props.onChange?.(event.target.value)}
      value={props.value}
    />
  ),
}));

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: toastError, success: toastSuccess }),
}));

type LoaderData = Route.ComponentProps['loaderData'];

interface Harness {
  readonly component: RenderResult;
  readonly lifecycleRequests: BlogPostLifecycleRequest[];
  readonly loaderCalls: () => number;
  readonly requests: BlogPostSaveRequest[];
}

const STALE: BlogPostSaveResult = {
  currentUpdatedAt: '2026-10-25T00:00:00.000Z',
  message: 'The post changed since it was read.',
  outcome: 'staleWrite',
};

const loaderDataFor = (
  post: BlogEditorPost,
  canWrite: boolean,
): LoaderData => ({
  authors: MOCK_BLOG_AUTHORS,
  canWrite,
  post: { ...post, __typename: 'BlogPostAdminObject' },
  tags: MOCK_BLOG_TAGS,
});

const renderEditor = (options: {
  readonly canWrite?: boolean;
  readonly lifecycleResult?: BlogPostLifecycleResult;
  readonly post?: BlogEditorPost;
  readonly results?: readonly BlogPostSaveResult[];
}): Harness => {
  const {
    canWrite = false,
    lifecycleResult = { outcome: 'unpublished' },
    post = MOCK_EDITOR_DRAFT,
    results = [],
  } = options;
  const lifecycleRequests: BlogPostLifecycleRequest[] = [];
  const requests: BlogPostSaveRequest[] = [];
  let calls = 0;
  const Stub = createRoutesStub([
    {
      Component,
      action: async ({ request }: { readonly request: Request }) => {
        const raw: unknown = await request.json();

        if (isBlogPostLifecycleBody(raw)) {
          const lifecycle = parseBlogPostLifecycleRequest(raw);

          if (lifecycle) {
            lifecycleRequests.push(lifecycle);
          }

          return lifecycleResult;
        }

        const body = parseBlogPostSaveRequest(raw);

        if (body) {
          requests.push(body);
        }

        return results[requests.length - 1] ?? { outcome: 'saved' };
      },
      loader: () => {
        calls += 1;

        return loaderDataFor(post, canWrite);
      },
      path: '/blog/:postId',
      shouldRevalidate,
    },
  ]);
  const component = render(
    <TooltipProvider>
      <Stub initialEntries={[`/blog/${post.id}`]} />
    </TooltipProvider>,
  );

  return { component, lifecycleRequests, loaderCalls: () => calls, requests };
};

const editTitle = async (
  component: RenderResult,
  title: string,
): Promise<UserEvent> => {
  const user = userEvent.setup();
  const input = await component.findByRole('textbox', { name: 'Title' });

  await user.clear(input);
  await user.type(input, title);

  return user;
};

const saveButton = (component: RenderResult): HTMLElement =>
  component.getByRole('button', { name: /Save draft/ });

describe('routes/blog.$postId.tsx', () => {
  test('Save draft sends only the changes plus the loaded updatedAt', async () => {
    const { component, requests } = renderEditor({});
    const user = await editTitle(component, 'Renamed');

    await user.click(saveButton(component));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({
      changes: { title: 'Renamed' },
      expectedUpdatedAt: MOCK_EDITOR_DRAFT.updatedAt,
      intent: 'save',
      tagSlugs: null,
    });
  });

  test('⌘S saves too', async () => {
    const { component, requests } = renderEditor({});
    const user = await editTitle(component, 'Shortcut');

    await user.keyboard('{Meta>}s{/Meta}');

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.intent).toBe('save');
  });

  test('Save draft is disabled until something changes', async () => {
    const { component } = renderEditor({});

    await component.findByRole('textbox', { name: 'Title' });

    expect(saveButton(component)).toBeDisabled();
  });

  test('a stale write opens the dialog; Overwrite resends the same changes', async () => {
    const { component, requests } = renderEditor({
      results: [STALE, { outcome: 'saved' }],
    });
    const user = await editTitle(component, 'Mine wins');

    await user.click(saveButton(component));
    const dialog = await component.findByRole('dialog', {
      name: 'This post changed since you opened it',
    });

    await user.click(within(dialog).getByRole('button', { name: 'Overwrite' }));

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toMatchObject({
      changes: { title: 'Mine wins' },
      intent: 'overwrite',
    });
    await waitFor(() =>
      expect(component.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  test('Reload discards local edits and re-runs the loader', async () => {
    const { component, loaderCalls } = renderEditor({ results: [STALE] });
    const user = await editTitle(component, 'Thrown away');

    await user.click(saveButton(component));
    const dialog = await component.findByRole('dialog');
    const callsBeforeReload = loaderCalls();

    await user.click(within(dialog).getByRole('button', { name: 'Reload' }));

    await waitFor(() =>
      expect(component.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(loaderCalls()).toBe(callsBeforeReload + 1));
    expect(component.getByRole('textbox', { name: 'Title' })).toHaveValue(
      MOCK_EDITOR_DRAFT.title,
    );
  });

  test('a stale write does not refetch the post behind the dialog', async () => {
    const { component, loaderCalls } = renderEditor({ results: [STALE] });
    const user = await editTitle(component, 'Edited');
    const callsBeforeSave = loaderCalls();

    await user.click(saveButton(component));
    await component.findByRole('dialog');

    expect(loaderCalls()).toBe(callsBeforeSave);
  });

  test('without blog:write a published post is read-only', async () => {
    const { component } = renderEditor({
      canWrite: false,
      post: MOCK_EDITOR_LIVE,
    });

    expect(
      await component.findByText('Only an admin can edit a published post'),
    ).toBeInTheDocument();
    expect(component.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      component.queryByRole('button', { name: /Save draft/ }),
    ).not.toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'Already live' }),
    ).toBeInTheDocument();
  });

  test('with blog:write a published post stays editable', async () => {
    const { component } = renderEditor({
      canWrite: true,
      post: MOCK_EDITOR_LIVE,
    });

    expect(
      await component.findByRole('textbox', { name: 'Title' }),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('BlogPostReadOnlyNotice'),
    ).not.toBeInTheDocument();
  });

  test('a slug conflict becomes an inline field error', async () => {
    const { component } = renderEditor({
      results: [
        { message: 'taken', outcome: 'slugConflict', slug: 'hello-world-2' },
      ],
    });
    const user = userEvent.setup();
    const slug = await component.findByRole('textbox', { name: 'Slug' });

    await user.clear(slug);
    await user.type(slug, 'hello-world-2');
    await user.click(saveButton(component));

    expect(
      await component.findByText('The slug "hello-world-2" is already taken.'),
    ).toBeInTheDocument();
  });

  test('losing publish permission mid-edit shows the read-only notice', async () => {
    const { component } = renderEditor({
      results: [{ message: 'nope', outcome: 'publishPermissionRequired' }],
    });
    const user = await editTitle(component, 'Too late');

    await user.click(saveButton(component));

    expect(
      await component.findByTestId('BlogPostReadOnlyNotice'),
    ).toBeInTheDocument();
  });

  describe('lifecycle controls', () => {
    const lifecycleButtons = (component: RenderResult): string[] =>
      component
        .getAllByRole('button')
        .map((button) => button.textContent?.trim() ?? '')
        .filter((name) =>
          [
            'Archive',
            'Move to draft',
            'Publish',
            'Reschedule',
            'Unpublish',
          ].includes(name),
        );

    test('are hidden without blog:write', async () => {
      const { component } = renderEditor({ canWrite: false });

      await component.findByRole('textbox', { name: 'Title' });

      expect(lifecycleButtons(component)).toEqual([]);
      expect(
        component.queryByTestId('BlogPostLifecycleControls'),
      ).not.toBeInTheDocument();
    });

    test.each([
      ['a draft', MOCK_EDITOR_DRAFT, ['Publish']],
      ['a scheduled post', MOCK_EDITOR_SCHEDULED, ['Reschedule', 'Unpublish']],
      ['a live post', MOCK_EDITOR_LIVE, ['Unpublish', 'Archive']],
      ['an archived post', MOCK_EDITOR_ARCHIVED, ['Publish', 'Move to draft']],
    ])('with blog:write, %s offers %j', async (_name, post, expected) => {
      const { component } = renderEditor({ canWrite: true, post });

      await component.findByTestId('BlogPostLifecycleControls');

      expect(lifecycleButtons(component)).toEqual(expected);
    });

    test('are disabled while the editor has unsaved changes', async () => {
      const { component } = renderEditor({ canWrite: true });

      await editTitle(component, 'Edited');

      expect(component.getByRole('button', { name: 'Publish' })).toBeDisabled();
      expect(
        component.getByText('Save your changes first'),
      ).toBeInTheDocument();
    });

    test('scheduling posts a UTC timestamp and re-reads the post', async () => {
      const { component, lifecycleRequests, loaderCalls } = renderEditor({
        canWrite: true,
        lifecycleResult: {
          outcome: 'published',
          publishedAt: new Date(2099, 5, 15, 10, 30).toISOString(),
          state: 'SCHEDULED',
        },
      });
      const user = userEvent.setup();

      await user.click(
        await component.findByRole('button', { name: 'Publish' }),
      );
      await user.type(
        component.getByLabelText('Go-live date and time'),
        '2099-06-15T10:30',
      );
      const callsBefore = loaderCalls();

      await user.click(component.getByRole('button', { name: 'Schedule' }));

      await waitFor(() => expect(lifecycleRequests).toHaveLength(1));
      expect(lifecycleRequests[0]).toEqual({
        intent: 'publish',
        publishedAt: new Date(2099, 5, 15, 10, 30).toISOString(),
      });
      await waitFor(() => expect(loaderCalls()).toBe(callsBefore + 1));
      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Post scheduled'),
      );
    });

    test('Archive confirms, posts, toasts and re-reads the post', async () => {
      const { component, lifecycleRequests, loaderCalls } = renderEditor({
        canWrite: true,
        lifecycleResult: { outcome: 'archived' },
        post: MOCK_EDITOR_LIVE,
      });
      const user = userEvent.setup();

      await user.click(
        await component.findByRole('button', { name: 'Archive' }),
      );
      const callsBefore = loaderCalls();

      await user.click(component.getByRole('button', { name: 'Archive post' }));

      await waitFor(() =>
        expect(lifecycleRequests).toEqual([{ intent: 'archive' }]),
      );
      await waitFor(() => expect(loaderCalls()).toBe(callsBefore + 1));
      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Post archived'),
      );
    });

    test('a post that no longer exists toasts an error and is not re-read', async () => {
      const { component, loaderCalls } = renderEditor({
        canWrite: true,
        lifecycleResult: {
          message: 'Blog post "post-live" was not found.',
          outcome: 'lifecycleNotFound',
        },
        post: MOCK_EDITOR_LIVE,
      });
      const user = userEvent.setup();

      await user.click(
        await component.findByRole('button', { name: 'Unpublish' }),
      );
      const callsBefore = loaderCalls();

      await user.click(
        component.getByRole('button', { name: 'Unpublish post' }),
      );

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith(
          'Blog post "post-live" was not found.',
        ),
      );
      expect(loaderCalls()).toBe(callsBefore);
    });
  });
});
