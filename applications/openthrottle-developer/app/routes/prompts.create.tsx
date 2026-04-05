import * as React from 'react';
import { redirect, useFetcher } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  EditorWindow,
  PROMPT_TYPE_OPTIONS,
} from '@openthrottle/react-router-editor';
import type { PromptType } from '@openthrottle/react-router-editor';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  CreatePromptDocument,
  type CreateCustomPromptInput,
  CustomPromptType,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/prompts.create';
import {
  PROMPTS_BASE_PATH,
  PROMPTS_DEFAULT_CONTENT,
} from '~/routing/prompts/config';

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create Prompt | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks
  const fetcher = useFetcher();
  const [content, setContent] = React.useState(PROMPTS_DEFAULT_CONTENT);
  const [description, setDescription] = React.useState('');
  const [filePath, setFilePath] = React.useState('');
  const [labels, setLabels] = React.useState('');
  const [promptType, setPromptType] = React.useState<PromptType>('prompts');
  const [title, setTitle] = React.useState('');

  // Setup
  const isSubmitting = fetcher.state === 'submitting';
  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  // Handlers
  const handleEditorChange = (value: string | undefined): void => {
    setContent(value ?? '');
  };

  const handleSubmit = React.useCallback((): void => {
    if (!canSubmit || isSubmitting) return;

    const formData = new FormData();
    formData.set('title', title.trim());
    formData.set('content', content);
    formData.set('promptType', promptType);

    if (description.trim()) {
      formData.set('description', description.trim());
    }

    if (labels.trim()) {
      formData.set('labels', labels.trim());
    }

    if (filePath.trim()) {
      formData.set('filePath', filePath.trim());
    }

    fetcher.submit(formData, { method: 'post' });
  }, [
    canSubmit,
    content,
    description,
    fetcher,
    filePath,
    isSubmitting,
    labels,
    promptType,
    title,
  ]);

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 🔌 Short Circuit

  return (
    <main className="flex flex-col flex-1" data-testid="prompts-create">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-4">
          <a
            className="text-sm text-gray-400 hover:text-white transition-colors"
            href={PROMPTS_BASE_PATH}
          >
            ← Back to prompts
          </a>
          <h1 className="text-lg font-semibold">Create New Prompt</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Error message */}
          {actionData?.error && (
            <span className="text-sm text-red-400">{actionData.error}</span>
          )}

          {/* Keyboard hint */}
          <span className="text-xs text-gray-500">⌘S to save</span>

          {/* Create button */}
          <button
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? 'Creating...' : 'Create Prompt'}
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div className="p-4 bg-gray-800/50 border-b border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Title */}
          <div>
            <label
              className="block text-sm font-medium text-gray-400 mb-1"
              htmlFor="title"
            >
              Title *
            </label>
            <input
              className="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
              id="title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Custom Prompt"
              required={true}
              type="text"
              value={title}
            />
          </div>

          {/* Type */}
          <div>
            <label
              className="block text-sm font-medium text-gray-400 mb-1"
              htmlFor="promptType"
            >
              Type *
            </label>
            <select
              className="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
              id="promptType"
              onChange={(e) => setPromptType(e.target.value as PromptType)}
              value={promptType}
            >
              {PROMPT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {/* File Path */}
          <div>
            <label
              className="block text-sm font-medium text-gray-400 mb-1"
              htmlFor="filePath"
            >
              File Path (optional)
            </label>
            <input
              className="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
              id="filePath"
              onChange={(e) => setFilePath(e.target.value)}
              placeholder=".cursor/rules/my-prompt.mdc"
              type="text"
              value={filePath}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Description */}
          <div>
            <label
              className="block text-sm font-medium text-gray-400 mb-1"
              htmlFor="description"
            >
              Description (optional)
            </label>
            <input
              className="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this prompt"
              type="text"
              value={description}
            />
          </div>

          {/* Labels */}
          <div>
            <label
              className="block text-sm font-medium text-gray-400 mb-1"
              htmlFor="labels"
            >
              Labels (comma-separated, optional)
            </label>
            <input
              className="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
              id="labels"
              onChange={(e) => setLabels(e.target.value)}
              placeholder="coding, typescript, react"
              type="text"
              value={labels}
            />
          </div>
        </div>
      </div>

      {/* Editor */}
      <EditorWindow
        language="markdown"
        onChange={handleEditorChange}
        value={content}
        wrapperProps={{ className: 'flex-1' }}
      />
    </main>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  const title = formData.get('title');
  const content = formData.get('content');
  const promptType = formData.get('promptType');
  const description = formData.get('description');
  const labelsRaw = formData.get('labels');
  const filePath = formData.get('filePath');

  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  if (typeof content !== 'string' || !content.trim()) {
    return { error: 'Content is required.' };
  }

  if (typeof promptType !== 'string') {
    return { error: 'Prompt type is required.' };
  }

  const labels =
    typeof labelsRaw === 'string' && labelsRaw.trim()
      ? labelsRaw
          .split(',')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      : [];

  try {
    const input: CreateCustomPromptInput = {
      content,
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : undefined,
      filePath:
        typeof filePath === 'string' && filePath.trim()
          ? filePath.trim()
          : undefined,
      labels,
      promptType: CustomPromptType.Prompts,
      title: title.trim(),
    };

    const result = await executeGraphqlWithAuth(
      args.request,
      CreatePromptDocument,
      { input },
    );

    if (!result.createCustomPrompt) {
      return { error: 'Failed to create prompt.' };
    }

    const newPromptId = result.createCustomPrompt.id;
    return redirect(`${PROMPTS_BASE_PATH}/${encodeURIComponent(newPromptId)}`);
  } catch {
    return { error: 'Failed to create prompt.' };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
