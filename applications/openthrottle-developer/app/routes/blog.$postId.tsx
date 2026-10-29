import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import type { ShouldRevalidateFunction } from 'react-router';

import type { Route } from '@/app/routes/+types/blog.$postId';
import { GetBlogPostEditorDocument } from '~/__generated__/graphql';
import { PERMISSIONS } from '~/global/config/permissions';
import { SITE_TITLE } from '~/global/config/settings';
import { hasPermission } from '~/global/utils/utils.permissions';
import {
  fetchMyPermissions,
  requirePermission,
} from '~/global/utils/utils.permissions.server';
import { runBlogPostEditorAction } from '~/routing/blog/actions/postId';
import { BlogPostEditorActions } from '~/routing/blog/components/BlogPostEditorActions';
import { BlogPostEditorHeader } from '~/routing/blog/components/BlogPostEditorHeader';
import { BlogPostEditorWorkspace } from '~/routing/blog/components/BlogPostEditorWorkspace';
import { BlogPostLifecycleControls } from '~/routing/blog/components/BlogPostLifecycleControls';
import { BlogPostReadOnlyNotice } from '~/routing/blog/components/BlogPostReadOnlyNotice';
import { BlogPostStaleWriteDialog } from '~/routing/blog/components/BlogPostStaleWriteDialog';
import { BlogPostUnsavedChangesDialog } from '~/routing/blog/components/BlogPostUnsavedChangesDialog';
import { BLOG_COPY, BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import { useBlogPostEditor } from '~/routing/blog/hooks/useBlogPostEditor';
import type {
  BlogPostActionResult,
  BlogPostEditorLoaderData,
} from '~/routing/blog/types';
import { didBlogPostSaveWrite } from '~/routing/blog/utils/editor';
import { didBlogPostLifecycleWrite } from '~/routing/blog/utils/lifecycle';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) =>
    match.loaderData?.post.title ?? BLOG_EDITOR_COPY.pageTitleFallback,
  links: (_match) => [{ children: BLOG_COPY.pageTitle, to: '/blog' }],
};

export const loader = async (
  args: Route.LoaderArgs,
): Promise<BlogPostEditorLoaderData> => {
  await requirePermission(args.request, PERMISSIONS.BLOG_DRAFT);

  const [editor, permissions] = await Promise.all([
    executeGraphqlWithAuth(args.request, GetBlogPostEditorDocument, {
      id: args.params.postId,
    }),
    fetchMyPermissions(args.request),
  ]);
  const { blogAdminAuthors, blogAdminPost, blogAdminTags } = editor;

  if (blogAdminPost.__typename !== 'BlogPostAdminObject') {
    throw new Response(blogAdminPost.message, { status: 404 });
  }

  return {
    authors: blogAdminAuthors,
    canWrite: hasPermission(permissions, PERMISSIONS.BLOG_WRITE),
    post: blogAdminPost,
    tags: blogAdminTags,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

/**
 * @description Re-read the post after a save or a lifecycle action (publish,
 * schedule, unpublish, archive) that wrote it, and on explicit revalidation
 * (the stale-write dialog's Reload). Skip it after an action that wrote
 * nothing, and after any other route's action (e.g. the global chat composer):
 * refetching then would hand the editor a newer `updatedAt` and silently defeat
 * the stale-write check.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (args) => {
  const { actionResult, defaultShouldRevalidate, formMethod } = args;

  if (formMethod === undefined) {
    return defaultShouldRevalidate;
  }

  return (
    (didBlogPostSaveWrite(actionResult) ||
      didBlogPostLifecycleWrite(actionResult)) &&
    defaultShouldRevalidate
  );
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const title =
    args.loaderData?.post.title ?? BLOG_EDITOR_COPY.pageTitleFallback;

  return [{ title: `${title} | ${BLOG_COPY.pageTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { authors, canWrite, post, tags } = loaderData;

  // Hooks
  const editor = useBlogPostEditor({ canWrite, post });

  // Setup

  // Handlers

  // Markup
  const actions = editor.isReadOnly ? null : (
    <BlogPostEditorActions
      canSave={editor.canSave}
      isDirty={editor.isDirty}
      isSaved={editor.isSaved}
      isSaving={editor.isSaving}
      lifecycle={
        <BlogPostLifecycleControls
          canWrite={canWrite}
          isDirty={editor.isDirty}
          post={post}
        />
      }
      onSave={editor.save}
      saveError={editor.saveError}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-col gap-6">
        <BlogPostEditorHeader
          actions={actions}
          post={post}
          title={editor.values.title}
        />
        {editor.isReadOnly ? <BlogPostReadOnlyNotice /> : null}
        <BlogPostEditorWorkspace
          authors={authors}
          errors={editor.fieldErrors}
          onFieldChange={editor.setField}
          postId={post.id}
          readOnly={editor.isReadOnly}
          tags={tags}
          values={editor.values}
        />
      </div>
      <BlogPostStaleWriteDialog
        isOverwriting={editor.isSaving}
        onDismiss={editor.dismissStaleWrite}
        onOverwrite={editor.overwrite}
        onReload={editor.reload}
        open={editor.isStaleWriteOpen}
      />
      <BlogPostUnsavedChangesDialog blocker={editor.blocker} />
    </GlobalScreen>
  );
}

export const action = async (
  args: Route.ActionArgs,
): Promise<BlogPostActionResult> => {
  await requirePermission(args.request, PERMISSIONS.BLOG_DRAFT);

  return runBlogPostEditorAction(args);
};

export const ErrorBoundary = GlobalErrorBoundary;
