import * as React from 'react';
import { redirect, useFetcher } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Editor, getLanguageFromExt } from '@openthrottle/react-router-editor';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  DeletePromptDocument,
  GetPromptDocument,
  UpdatePromptDocument,
  WritePromptToFileSystemDocument,
  type UpdateCustomPromptInput,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { PROMPTS_BASE_PATH } from '~/routing/prompts/config';
import { PromptDetailMetadataPanel } from '~/routing/prompts/components/PromptDetailMetadataPanel';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/prompts.$promptId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.prompt.title ?? 'Prompt Details',
  links: (_match) => [{ children: 'Prompts', to: '/prompts' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const promptId = args.params.promptId;

  if (!promptId) {
    throw new Response('Missing prompt id', { status: 400 });
  }

  const decodedId = decodeURIComponent(promptId);

  const { customPrompt } = await executeGraphqlWithAuth(
    args.request,
    GetPromptDocument,
    { id: decodedId },
  );

  if (!customPrompt) {
    throw new Response('Prompt not found', { status: 404 });
  }

  return { prompt: customPrompt };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const title = args.loaderData?.prompt?.title ?? 'Edit prompt';
  return [{ title: `${title} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { prompt } = loaderData;

  // Hooks
  const fetcher = useFetcher();
  const [content, setContent] = React.useState(prompt.content);
  const [isDirty, setIsDirty] = React.useState(false);

  // Setup
  const isSubmitting = fetcher.state === 'submitting';
  const extension = prompt.filePath?.split('.').pop() ?? 'md';
  const language = getLanguageFromExt(extension as unknown as any);

  // Handlers
  const handleEditorChange = (value: string | undefined): void => {
    const newContent = value ?? '';
    setContent(newContent);
    setIsDirty(newContent !== prompt.content);
  };

  const handleSave = React.useCallback((): void => {
    if (!isDirty || isSubmitting) return;

    const formData = new FormData();
    formData.set('intent', 'update');
    formData.set('content', content);

    fetcher.submit(formData, { method: 'post' });
  }, [content, fetcher, isDirty, isSubmitting]);

  const handleWriteToFileSystem = (): void => {
    const formData = new FormData();
    formData.set('intent', 'writeToFileSystem');

    fetcher.submit(formData, { method: 'post' });
  };

  const handleDelete = (): void => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;

    const formData = new FormData();
    formData.set('intent', 'delete');

    fetcher.submit(formData, { method: 'post' });
  };

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  // Markup
  const statusText = React.useMemo(() => {
    if (isSubmitting) return 'Saving...';
    if (actionData?.error) return actionData.error;
    if (actionData?.success) return 'Saved';
    if (isDirty) return 'Unsaved changes';

    return '';
  }, [actionData, isDirty, isSubmitting]);

  // Life Cycle
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  React.useEffect(() => {
    if (actionData?.success) {
      setIsDirty(false);
    }
  }, [actionData?.success]);

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex h-full flex-1 flex-col">
      {/* Header with prompt info and actions */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <a
            className="text-sm text-gray-400 transition-colors hover:text-white"
            href={PROMPTS_BASE_PATH}
          >
            ← Back to prompts
          </a>
          <h1 className="text-lg">{prompt.title}</h1>
          <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
            {prompt.promptType}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          {statusText && (
            <span
              className={`text-sm ${
                actionData?.error
                  ? 'text-red-400'
                  : isDirty
                    ? 'text-yellow-400'
                    : 'text-gray-400'
              }`}
            >
              {statusText}
            </span>
          )}

          {/* Keyboard hint */}
          <span className="text-xs text-gray-500">⌘S to save</span>

          {prompt.filePath && (
            <Button disabled={isSubmitting} onClick={handleWriteToFileSystem}>
              Write to File
            </Button>
          )}

          <Button disabled={!isDirty || isSubmitting} onClick={handleSave}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>

          <Button
            disabled={isSubmitting}
            onClick={handleDelete}
            variant="destructive"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* <div className="p-4"> */}
      <PromptDetailMetadataPanel
        contentLength={content.length}
        debugContent={content}
        prompt={prompt}
      />
      {/* </div> */}

      {/* Editor */}
      <Editor
        basePath={PROMPTS_BASE_PATH}
        language={language}
        onChange={handleEditorChange}
        // showSidebar={false}
        // showTabs={false}
        // showToolbar={false}
        value={content}
        wrapperProps={{ className: 'flex-1' }}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const promptId = args.params.promptId;

  if (!promptId) {
    return { error: 'Missing prompt id.' };
  }

  const decodedId = decodeURIComponent(promptId);
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  // Handle delete
  if (intent === 'delete') {
    try {
      await executeGraphqlWithAuth(args.request, DeletePromptDocument, {
        id: decodedId,
      });

      return redirect(PROMPTS_BASE_PATH);
    } catch {
      return { error: 'Failed to delete prompt.' };
    }
  }

  // Handle write to file system
  if (intent === 'writeToFileSystem') {
    try {
      await executeGraphqlWithAuth(
        args.request,
        WritePromptToFileSystemDocument,
        { id: decodedId },
      );

      return { success: true };
    } catch {
      return { error: 'Failed to write to file system.' };
    }
  }

  // Handle update
  if (intent === 'update') {
    const content = formData.get('content');

    if (typeof content !== 'string') {
      return { error: 'Content is required.' };
    }

    try {
      const input: UpdateCustomPromptInput = {
        content,
        id: decodedId,
      };

      const result = await executeGraphqlWithAuth(
        args.request,
        UpdatePromptDocument,
        { input },
      );

      if (!result.updateCustomPrompt) {
        return { error: 'Prompt not found.' };
      }

      return { success: true };
    } catch {
      return { error: 'Failed to update prompt.' };
    }
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
