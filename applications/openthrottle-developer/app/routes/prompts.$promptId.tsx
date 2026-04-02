import * as React from 'react';
import { redirect, useFetcher } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Editor, getLanguageFromExt } from '@openthrottle/react-router-editor';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  DeletePromptDocument,
  GetPromptDocument,
  UpdatePromptDocument,
  WritePromptToFileSystemDocument,
  type UpdateCustomPromptInput,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/prompts.$promptId';
import { PROMPTS_BASE_PATH } from '~/routing/prompts/config';

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
  const title = args.data?.prompt?.title ?? 'Edit prompt';
  return [{ title: `${title} | ${SITE_TITLE}` }];
});

export default function Index(props: Route.ComponentProps) {
  const { actionData, loaderData } = props;
  const { prompt } = loaderData;

  // Hooks
  const fetcher = useFetcher();
  const [content, setContent] = React.useState(prompt.content);
  const [isDirty, setIsDirty] = React.useState(false);

  // Setup
  const isSubmitting = fetcher.state === 'submitting';
  const extension = prompt.filePath?.split('.').pop() ?? 'md';

  // FIXME: Swap out eventually

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
    <main className="flex flex-col flex-1" data-testid="prompts-editor">
      {/* Header with prompt info and actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-4">
          <a
            className="text-sm text-gray-400 hover:text-white transition-colors"
            href={PROMPTS_BASE_PATH}
          >
            ← Back to prompts
          </a>
          <h1 className="text-lg font-semibold">{prompt.title}</h1>
          <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
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

          {/* Write to file system */}
          {prompt.filePath && (
            <button
              className="px-3 py-1.5 text-sm rounded-md bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
              onClick={handleWriteToFileSystem}
              type="button"
            >
              Write to File
            </button>
          )}

          {/* Save button */}
          <button
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={!isDirty || isSubmitting}
            onClick={handleSave}
            type="button"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>

          {/* Delete button */}
          <button
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleDelete}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Prompt metadata */}
      {/* {prompt.description && (
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 text-sm text-gray-400">
          {prompt.description}
        </div>
      )} */}

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
    </main>
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

  return { error: 'Invalid action.' };
};

export const ErrorBoundary = GlobalErrorBoundary;
